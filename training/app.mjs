import {lessons,preparationSteps,recoverySteps,sources as curriculumSources} from './content/curriculum.mjs';
import {cases,landmarks,sources as caseSources,trainingNotice} from './content/cases.mjs';
import {createSession,transition,assess,restoreSession,exportReport,REGIONS,REGION_NAMES} from './session.mjs';
import {createWorld} from './world.mjs';
import {createEndoscope} from './endoscope.mjs';
import {mountLearning} from './learning.mjs';
import {mountControlDemo,demoPose} from './control-demo.mjs';
import {DEMO_CHECKPOINT,demoCanStart,demoReturnState,caseCheckpoint,demoBlocksAction} from './demo-lifecycle.mjs';
import {savePhoto,loadPhotos,retainSessionPhotos} from './storage.mjs';
import {clinicalAtlas} from './content/clinical-atlas.mjs';
import {buildReportHTML} from './report.mjs';
import {savedCheckpoint,validCapture,loadSessionImages,needsLiveView} from './app-lifecycle.mjs';

const config={cases,landmarks,preparationSteps,recoverySteps};
const sources=[...new Map([...curriculumSources,...caseSources].map(s=>[s.id,s])).values()];
const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name)=>({arrow:'↗',check:'✓',close:'×',play:'▷',pause:'Ⅱ',photo:'⊙',settings:'⚙',map:'⌖',book:'▤',scope:'◉',sound:'♪'}[name]||name);
let learningStudio=null,lastPanelKey='',inspectorPart='wheels';
let session=null,world=null,scope=null,room='theory',view='world',selectedCase=cases[0].id,loadingScope=false,scopeReady=false;
let telemetry={region:'entry',progress:0,visibility:1,dwell:0,gas:.36,fluid:.08,contact:false,retroflex:false};
let scopeInit=null,scopeLoadGeneration=0;
let controlDemo=null;
let sessionGeneration=0,photosLoading=false,pendingScopeCheckpoint=null,pendingScopeSessionId=null;
let saved=null,completedLessons={},activeLesson=lessons[0].id,activeTab='mission',showIntro=true,muted=true,audioContext=null;
let currentPrep=null,photoData=new Map(),lastSave=0,lastTick=0,lastFrame=performance.now(),raf=0,roomPos={room:'theory',x:-8,z:3,heading:0};
const preferences={quality:'balanced',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
try {const raw=localStorage.getItem('lumen.training.v1');if(raw){const value=JSON.parse(raw);saved=restoreSession(value.session,config)?value:null;}completedLessons=JSON.parse(localStorage.getItem('lumen.lessons.v1')||'{}');}catch{/* Private browsing and old saves do not block learning. */}

document.querySelector('#app').innerHTML=`
  <header class="topbar">
    <button class="brand" data-action="home" aria-label="Lumen home"><span class="brand-mark">L</span><span>LUMEN<small>ENDOSCOPY ACADEMY</small></span></button>
    <nav class="room-nav" aria-label="Training suite rooms"><button data-room="theory" class="active"><span>01</span> Theory room</button><button data-room="procedure"><span>02</span> Procedure room</button><button data-room="recovery"><span>03</span> Recovery</button></nav>
    <div class="top-actions"><span class="simulation-badge"><i></i> TRAINING SUITE</span><button class="icon-button" data-action="help" aria-label="Controls and help">?</button><button class="icon-button" data-action="settings" aria-label="Settings">${icon('settings')}</button></div>
  </header>
  <main class="workspace">
    <aside class="rail"><div class="rail-top"><span class="eyebrow">YOUR SESSION</span><button class="small-link" data-action="cases">Change case ${icon('arrow')}</button></div><div id="case-summary"></div><div id="journey"></div><div class="rail-bottom"><button class="secondary" data-action="curriculum">${icon('book')} Open learning library <span>16</span></button><button class="text-button" data-action="sources">Clinical sources & model limits ${icon('arrow')}</button><div class="local-note"><i></i> Progress saved on this device</div></div></aside>
    <section class="simulation-stage" aria-label="Interactive endoscopy suite">
      <div id="world-view"></div><div class="patient-inset-label">LEFT LATERAL · SIMULATION MANNEQUIN</div>
      <div class="world-header"><div><span class="eyebrow">THE TRAINING SUITE</span><h1 id="room-title">The theory room</h1><p id="room-subtitle">Understand the instrument. Prepare for the procedure.</p></div><button class="glass-button" data-action="fullscreen" aria-label="Enter full screen">⛶</button></div>
      <div class="world-actions"><button data-station="curriculum">Explore the curriculum ${icon('arrow')}</button><button data-action="instrument">Inspect equipment ${icon('arrow')}</button><button data-station="patient">Patient & setup ${icon('arrow')}</button></div>
      <div class="world-footer"><span><kbd>W A S D</kbd> Walk <b>·</b> Drag to look <b>·</b> <kbd>E</kbd> Interact</span><div class="minimap" aria-label="Your location in the training suite"><span data-map-room="theory">THEORY</span><span data-map-room="procedure">PROCEDURE</span><span data-map-room="recovery">RECOVERY</span><i id="map-dot"></i></div></div>
      <div class="touch-walk" aria-label="Room movement controls"><button data-walk="ArrowUp" aria-label="Walk forward">↑</button><div><button data-walk="ArrowLeft" aria-label="Walk left">←</button><button data-walk="ArrowDown" aria-label="Walk backwards">↓</button><button data-walk="ArrowRight" aria-label="Walk right">→</button></div></div>
      <section id="scope-stage" hidden aria-label="Endoscopy operator view">
        <div class="monitor-toolbar"><div><i class="live-dot"></i> LIVE ENDOSCOPIC VIEW <span>WHITE LIGHT · SYNTHETIC MODEL</span></div><button class="glass-button" data-action="room-view">View procedure room ${icon('arrow')}</button></div>
        <div id="endoscope-view"><div class="scope-loading" id="scope-loading">Preparing the endoscopy model…</div><div class="scope-osd"><span id="scope-region">Oesophagus</span><small id="scope-position">AT ENTRY</small></div><div class="scope-crosshair"></div><div class="scope-caption"><span id="scope-state">Ready for direct-vision insertion</span><span id="scope-timer">00:00</span></div></div>
        <div class="monitor-status"><span><i class="status-light"></i> <span id="visibility-label">Clear view</span></span><span id="tip-label">Route-assisted insertion</span><button class="small-link" data-action="atlas">Clinical reference atlas ↗</button></div>
        <div class="patient-strip"><span class="patient-label">SIMULATED OBSERVATIONS</span><div><small>SpO₂</small><strong id="spo2">98<span>%</span></strong></div><div><small>HR</small><strong>72<span>/min</span></strong></div><div><small>BP</small><strong>122/76<span>mmHg</span></strong></div><div><small>Resp.</small><strong>14<span>/min</span></strong></div><svg class="ecg" viewBox="0 0 170 36" aria-hidden="true"><path d="M0 20H23l5-5 5 5h17l6-14 6 25 6-11h28l5-5 5 5h20l6-14 6 25 6-11h26"/></svg><button data-action="drill" class="small-link">Safety drill ${icon('arrow')}</button></div>
      </section>
      <div class="stage-error" id="stage-error" hidden></div>
      <section class="welcome" id="welcome"><div class="welcome-image"></div><div class="welcome-shade"></div><div class="welcome-content"><span class="eyebrow">A NEW PERSPECTIVE ON PROCEDURAL LEARNING</span><h1>Step into<br>your next<br><em>procedure.</em></h1><p>Prepare with purpose. Explore the upper GI tract.<br>Build a thoughtful, systematic examination.</p><button class="primary" data-action="cases">Begin an upper endoscopy <span>→</span></button><button class="resume-button" data-action="control-demo">Explore the scope controls →</button>${saved?'<button class="resume-button" data-action="resume">Resume your saved session →</button>':''}<div class="welcome-meta"><span>3 connected spaces</span><span>7 clinical scenarios</span><span>16 learning modules</span></div><small class="welcome-notice">Educational simulation · Fictional patients · Expert validation pending</small></div><span class="image-credit">Synthetic environment concept</span></section>
    </section>
    <aside class="coach"><div class="coach-heading"><span class="eyebrow">YOUR CLINICAL COMPANION</span><span class="coach-symbol">✧</span></div><nav class="coach-tabs" aria-label="Session panels"><button data-tab="mission" class="active">Workflow</button><button data-tab="findings">Findings</button><button data-tab="log">Record</button></nav><div id="coach-body"></div></aside>
  </main>
  <section class="operator-console" id="operator-console" hidden aria-label="Endoscope controls">
    <div class="controller-visual" title="Generic illustrated control head"><img class="real-handpiece" src="/training/assets/scope-handpiece.png" alt="Synthetic gloved left hand holding a generic gastroscope control head"><div class="demo-wheel-cue" aria-hidden="true"><i id="demo-wheel-pitch"></i><i id="demo-wheel-yaw"></i></div><div class="glove glove-one"></div><div class="glove glove-two"></div><div class="scope-handle"><span class="handle-valve red"></span><span class="handle-valve blue"></span><div class="handle-wheel" id="handle-wheel"><i></i></div><div class="handle-smallwheel" id="handle-smallwheel"></div><div class="handle-port"></div></div><div class="scope-cable"></div><span>CONTROL HEAD <small>Generic training interface</small></span></div>
    <div class="angle-controls"><div class="console-title">Tip angulation <button class="small-link" data-action="centre">Centre controls</button></div><label><span>Up / down</span><input id="pitch" aria-label="Up down angulation" type="range" min="-1.5" max="1.5" step=".01" value="0"><output id="pitch-value">0°</output></label><label><span>Left / right</span><input id="yaw" aria-label="Left right angulation" type="range" min="-1.5" max="1.5" step=".01" value="0"><output id="yaw-value">0°</output></label><label><span>Shaft rotation</span><input id="roll" aria-label="Shaft rotation" type="range" min="-3.14" max="3.14" step=".01" value="0"><output id="roll-value">0°</output></label></div>
    <div class="insertion-controls"><div class="console-title">Insertion & inspection <button class="small-link" data-action="control-demo">Controls demo ↗</button></div><div class="advance-buttons"><button data-hold="KeyS"><kbd>S</kbd> Withdraw</button><button data-hold="KeyW"><kbd>W</kbd> Advance</button></div><div class="secondary-controls"><button data-action="retroflex" id="retroflex-button" aria-pressed="false">Retroflex view</button><button data-action="photo">${icon('photo')} Capture</button></div><button class="text-button" data-action="observe">Document current region <span>→</span></button></div>
    <div class="fluid-controls"><div class="console-title">Air · water · suction</div><div class="fluid-buttons"><button data-hold="KeyI"><span>I</span>Insufflate</button><button data-hold="KeyJ"><span>J</span>Irrigate</button><button data-hold="KeyK"><span>K</span>Suction</button><button data-hold="KeyL"><span>L</span>Lens wash</button></div><div class="fluid-meters"><label>Distension <meter id="gas-meter" min="0" max="1" value=".36"></meter></label><label>Fluid <meter id="fluid-meter" min="0" max="1" value=".08"></meter></label></div></div>
  </section>
  <footer class="app-footer"><span>UPPER GI · SUPERVISED LEARNING</span><span>Illustrative anatomy & controls · No competence certification</span><button data-action="sources">Evidence & credits ${icon('arrow')}</button></footer>
  <dialog id="modal"><div class="modal-top"><span class="eyebrow" id="modal-kicker">LUMEN ACADEMY</span><button class="icon-button" data-action="close-modal" aria-label="Close dialog">×</button></div><div id="modal-body"></div></dialog>
  <div id="toast" role="status" aria-live="polite"></div>`;

function toast(message,error=false){const el=$('#toast');el.textContent=message;el.classList.toggle('error',error);el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),5000);}
function persist(){
 if(!session)return;
 const checkpoint=caseCheckpoint({demo:controlDemo,scopeReady,scopeSnapshot:scope?.snapshot(),pendingScopeCheckpoint,pendingScopeSessionId,sessionId:session.id});
 saved=savedCheckpoint(session,checkpoint);
 if(!$('#welcome [data-action="resume"]')){const resume=document.createElement('button');resume.className='resume-button';resume.dataset.action='resume';resume.textContent='Resume your saved session →';$('#welcome .welcome-meta').before(resume);}
 try{localStorage.setItem('lumen.training.v1',JSON.stringify(saved));}catch{ $('.local-note').textContent='Saving unavailable in this browser';}
}
function dispatch(action,quiet=false){if(!session)return {ok:false};if(controlDemo&&demoBlocksAction(action))return {ok:false,message:'Finish controls practice before returning to the case.',session};if(needsLiveView(action)&&(!scopeReady||photosLoading||view!=='scope'||showIntro||$('#modal').open)){const message='Return to a ready endoscopic view before continuing the examination.';if(!quiet)toast(message,true);return {ok:false,message,session};}const r=transition(session,{...action,telemetry:action.telemetry||telemetry},config);if(!r.ok){if(!quiet)toast(r.message,true);return r;}session=r.session;if(action.type!=='TICK'){persist();render();}return r;}
const currentCase=()=>cases.find(c=>c.id===(session?.caseId||selectedCase))||cases[0];
function hideWelcome(){showIntro=false;$('#welcome').hidden=true;}
function openModal(html,kicker='LUMEN ACADEMY',wide=false){learningStudio?.destroy();learningStudio=null;$('#modal').classList.remove('library-modal');scope?.setEnabled(false);world?.setProcedureActive(true);$('#modal-body').innerHTML=html;$('#modal-kicker').textContent=kicker;$('#modal').classList.toggle('wide',wide);if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){$('#modal').close();syncControls();}
$('#modal').addEventListener('close',()=>{learningStudio?.destroy();learningStudio=null;$('#modal').classList.remove('library-modal');syncControls();});
function syncControls(){
 const demoState=controlDemo?.state;
 const practicing=!!controlDemo&&!controlDemo.returning&&demoState?.practicing&&!demoState.paused&&scopeReady&&!loadingScope&&!$('#modal').open;
 const operating=!controlDemo&&view==='scope'&&!showIntro&&session?.phase==='procedure'&&!session.paused&&!session.emergency&&!$('#modal').open&&scopeReady&&!photosLoading;
 scope?.setEnabled(operating||practicing);scope?.setTool(controlDemo?'idle':session?.biopsy.stage||'idle');
 world?.setProcedureActive(showIntro||view==='scope'||$('#modal').open);
 document.querySelectorAll('[data-hold],#pitch,#yaw,#roll,#retroflex-button,[data-action=centre],[data-action=observe],[data-action=photo],[data-finding],[data-biopsy],[data-sample-step]').forEach(b=>b.disabled=!operating);
 if(practicing)document.querySelectorAll('#pitch,#yaw,#roll,[data-action=centre]').forEach(b=>b.disabled=false);
 document.querySelectorAll('[data-hold]').forEach(b=>{if(!operating)b.classList.remove('held');});
 document.querySelectorAll('[data-demo-locked]').forEach(b=>{b.disabled=b.dataset.demoLocked==='true';delete b.dataset.demoLocked;});
 if(controlDemo)document.querySelectorAll('[data-room],[data-station],[data-map-room],[data-phase],[data-tab],[data-action=home],[data-action=cases],[data-action=control-demo],[data-action=help],[data-action=settings],[data-action=room-view],[data-action=drill],[data-action=atlas],[data-action=curriculum],[data-action=instrument]').forEach(b=>{b.dataset.demoLocked=String(b.disabled);b.disabled=true;});
 document.querySelectorAll('[data-action="export"],[data-action="export-json"],[data-action="gallery"]').forEach(b=>b.disabled=photosLoading||!!controlDemo);
 const selected=demoState?.stepId;
 for(const axis of ['pitch','yaw','roll'])$('#'+axis).closest('label').classList.toggle('demo-active-control',!!controlDemo&&(selected===axis||demoState?.practicing));
 document.querySelector('[data-action=centre]').classList.toggle('demo-active-control',!!controlDemo&&selected==='centre');
}

function setRoom(id){room=id;hideWelcome();view='world';$('#scope-stage').hidden=true;$('#operator-console').hidden=true;document.body.classList.remove('operating');world?.setRoom(id);renderRooms();syncControls();if(id==='theory'&&session?.phase!=='procedure')activeTab='mission';renderPanel();}
function renderRooms(){const names={theory:['The theory room','Understand the instrument. Prepare for the procedure.'],procedure:['The procedure room','A systematic examination begins before insertion.'],recovery:['Recovery & reflection','Close the loop. Handover, observe and reflect.']};$('#room-title').textContent=names[room][0];$('#room-subtitle').textContent=names[room][1];document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===room));document.querySelectorAll('[data-map-room]').forEach(b=>b.classList.toggle('active',b.dataset.mapRoom===roomPos.room));$('.world-header').hidden=view==='scope';$('.world-footer').hidden=view==='scope';$('.world-actions').hidden=view==='scope';$('.touch-walk').hidden=view==='scope';}

function render(){
  $('#spo2').innerHTML=(session?.emergency?'88':'98')+'<span>%</span>';
  const c=currentCase();$('#case-summary').innerHTML=`<div class="case-icon">${icon('scope')}</div><small class="eyebrow">UPPER ENDOSCOPY</small><h2>${esc(c.title)}</h2><p>${esc(c.subtitle)}</p><div class="case-meta"><span>${esc(c.difficulty)}</span><span>Case ${String(cases.indexOf(c)+1).padStart(2,'0')}</span></div>`;
  const phases=[['briefing','Patient briefing','Review the case'],['preparation','Prepare & check',`${session?.preparation.length||0} / ${preparationSteps.length} checks`],['procedure','Upper GI examination',`${session?.observations.length||0} / 8 regions`],['recovery','Recovery & handover',`${session?.recovery.length||0} / ${recoverySteps.length} checks`],['debrief','Your debrief','Reflect on the session']];
  const active=phases.findIndex(x=>x[0]===session?.phase);
  $('#journey').innerHTML='<span class="eyebrow">LEARNING JOURNEY</span>'+phases.map(([id,title,detail],i)=>`<button class="journey-step ${i===active?'active':''} ${i<active?'done':''}" data-phase="${id}" ${i>active?'disabled':''}><span class="step-index">${i<active?'✓':String(i+1).padStart(2,'0')}</span><span><b>${title}</b><small>${esc(detail)}</small></span>${i===active?'<i></i>':''}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));renderRooms();renderPanel();syncControls();
  world?.setPatientPrepared(session?.position==='left-lateral');
}

function sourceLinks(ids){return `<div class="source-links">${ids.map(id=>sources.find(s=>s.id===id)).filter(Boolean).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.organization||s.title)}${s.year?' · '+s.year:''} ↗</a>`).join('')}</div>`;}
function renderPanel(){
  if(controlDemo)return;
  const el=$('#coach-body'),c=currentCase();const panelKey=[session?.phase,activeTab,Boolean(session?.emergency)].join(':');if(panelKey!==lastPanelKey){el.scrollTop=0;lastPanelKey=panelKey;}
  if(!session){el.innerHTML=`<div class="panel-intro"><span class="line-icon">✧</span><h2>Practice with purpose.</h2><p>Move through a complete diagnostic upper-endoscopy session, from your first patient check to your final handover.</p><button class="primary" data-action="cases">Choose a scenario →</button></div><div class="small-feature"><span>01</span><div><b>Prepare thoughtfully</b><p>Patient, team and equipment.</p></div></div><div class="small-feature"><span>02</span><div><b>See the whole picture</b><p>Inspect, document and sample appropriately.</p></div></div><div class="small-feature"><span>03</span><div><b>Learn from the session</b><p>Review coverage and decisions.</p></div></div><p class="fineprint">The procedure is a route-assisted, synthetic training model. Lower-GI indications are taught in the library; lower-GI procedural training is not yet included.</p>`;return;}
  if(activeTab==='log'&&!session.emergency){renderRecord(el);return;}
  if(activeTab==='findings'&&!session.emergency){renderFindings(el,c);return;}
  if(session.phase==='briefing'){el.innerHTML=`<span class="eyebrow">CASE BRIEFING</span><h2>Meet your patient.</h2><p>${esc(c.description)}</p><div class="patient-card"><b>${esc(c.patient.name)}</b><span>${c.patient.age} years · ${esc(c.patient.sex)} · ASA ${esc(c.patient.asa)}</span><small>Fictional teaching scenario</small></div><h3>Indication</h3><p>${esc(c.patient.indication)}</p><h3>Your objectives</h3><ul class="clean-list">${c.objectives.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><button class="secondary" data-action="patient">Review patient details ↗</button><button class="primary" data-action="brief">Accept case & prepare →</button>`;return;}
  if(session.phase==='preparation'){
    el.innerHTML=`<span class="eyebrow">BEFORE THE PROCEDURE</span><h2>Prepare with confidence.</h2><p>Perform each simulated check. Read the details before recording completion.</p><div class="completion-line"><span>${session.preparation.length} of ${preparationSteps.length} complete</span><b>${Math.round(session.preparation.length/preparationSteps.length*100)}%</b></div><progress max="${preparationSteps.length}" value="${session.preparation.length}"></progress><div class="checklist">${preparationSteps.map(s=>`<button data-prep="${s.id}" class="check-row ${session.preparation.includes(s.id)?'complete':''}"><span class="check-square">${session.preparation.includes(s.id)?'✓':''}</span><span><small>${esc(s.group)}</small>${esc(s.title)}</span><i>›</i></button>`).join('')}</div><button class="primary" data-action="start">Enter the examination →</button><p class="fineprint">Routine EGD uses hand hygiene and appropriate PPE. A surgical scrub is not universally required.</p>`;return;
  }
  if(session.phase==='procedure'){
    if(session.emergency){el.innerHTML=`<div class="safety-alert"><span class="eyebrow">SCRIPTED SAFETY DRILL</span><h2>Oxygen desaturation.</h2><p>The simulated saturation has fallen. Pause the procedure and coordinate the team response. These are scripted observations, not a physiological prediction.</p></div>${[['stop','Stop procedural stimulation'],['help','Call the trained rescue team'],['airway','Assess airway & ventilation; team oxygen support'],['monitor','Reassess breathing, consciousness and monitoring']].map(([id,label])=>`<button class="check-row ${session.emergency.actions.includes(id)?'complete':''}" data-response="${id}"><span class="check-square">${session.emergency.actions.includes(id)?'✓':''}</span>${label}</button>`).join('')}<button class="primary" data-action="resolve">Team reassessed · Resume simulation</button><p class="fineprint">Oxygen saturation does not measure ventilation. Use appropriate respiratory assessment and monitoring; medication and airway interventions require trained clinicians.</p>`;return;}
    const stats=assess(session,config);el.innerHTML=`<div class="live-coaching"><div class="procedure-heading"><span class="eyebrow">LIVE GUIDANCE</span><button class="small-link" data-action="pause">${session.paused?'Resume':'Pause'}</button></div><h2 id="coach-region">${esc(REGION_NAMES[telemetry.region])}</h2><div class="guidance-card" id="guidance-card"><i></i><p id="live-guidance">${esc(telemetry.guide||'Advance under direct vision. Keep the lumen in view.')}</p></div></div>${view==='world'?'<button class="primary" data-action="scope-view">Return to scope controls →</button>':''}<h3>Inspection coverage <span>${stats.inspectedCount}/8</span></h3><div class="region-list">${REGIONS.map(id=>`<div class="region-row ${session.observations.includes(id)?'complete':''}" data-region="${id}"><i>${session.observations.includes(id)?'✓':''}</i><span>${esc(REGION_NAMES[id])}</span><b>${telemetry.region===id?'HERE':''}</b></div>`).join('')}</div><button class="secondary" data-action="observe">Document current region ✓</button><div class="landmark-photo"><label for="photo-landmark">Photograph label</label><select id="photo-landmark">${photoOptions()}</select><button class="secondary" data-action="photo">Capture & label image ${icon('photo')}</button></div><div class="subtle-note">${stats.missingLandmarkPhotos.length} of 10 named photo views still to label. Labels record your intent; an expert must verify the actual view.</div><button class="text-button" data-action="end">Withdraw & hand over →</button><p class="fineprint">Insertion follows an anatomical route. Angulation changes the view; tissue forces and flexible-shaft mechanics are not calibrated.</p>`;return;
  }
  if(session.phase==='recovery'){
    el.innerHTML=`<span class="eyebrow">AFTER THE EXAMINATION</span><h2>Every detail matters.</h2><p>Complete the handover, account for specimens and confirm recovery before discharge.</p><div class="checklist">${recoverySteps.map(s=>`<button data-recovery="${s.id}" class="check-row ${session.recovery.includes(s.id)?'complete':''}"><span class="check-square">${session.recovery.includes(s.id)?'✓':''}</span><span>${esc(s.title)}</span><i>›</i></button>`).join('')}</div><label class="report-label" for="procedure-report">Impression & follow-up plan</label><textarea id="procedure-report" maxlength="6000" placeholder="Describe visible findings, limitations, samples and who will review the results…">${esc(session.report)}</textarea><button class="primary" data-action="finish">Complete session & debrief →</button>`;return;
  }
  renderDebrief(el);
}

function photoOptions(){const available=landmarks.filter(l=>l.runtimeRegion===telemetry.region);return `<option value="">Regional teaching view</option>`+available.map(l=>`<option value="${l.id}">${esc(l.title)}</option>`).join('');}
function renderFindings(el,c){
  const canSample=session.phase==='procedure';
  el.innerHTML=`<span class="eyebrow">OBSERVE BEFORE YOU INTERPRET</span><h2>Findings & specimens.</h2><p>Describe the visible pattern. A simulated appearance cannot establish histology.</p>${c.findings.map(f=>{const count=session.specimens.filter(s=>s.findingId===f.id).reduce((n,s)=>n+s.count,0);return `<article class="finding-card ${session.findings.includes(f.id)?'documented':''}"><small>${esc(REGION_NAMES[f.region])}</small><h3>${esc(f.title)}</h3><p>${esc(f.appearance)}</p><details><summary>Interpretation & next action</summary><p>${esc(f.interpretation)}</p><p>${esc(f.action)}</p>${sourceLinks(f.sourceIds)}</details><div class="finding-actions"><button class="secondary" data-finding="${f.id}" ${!canSample?'disabled':''}>${session.findings.includes(f.id)?'✓ Recorded':'Record finding'}</button><button class="small-link ${f.biopsy==='avoid'?'danger-text':''}" data-biopsy="${f.id}" ${!canSample?'disabled':''}>${f.biopsy==='avoid'?'Why no biopsy?':f.biopsy==='none'?'Sampling rationale':'Sampling workflow →'}</button></div>${f.sampleCount?`<div class="sample-count">${count} / ${f.sampleCount} planned sample fragments logged</div>`:''}</article>`;}).join('')}`;
}
function renderRecord(el){el.innerHTML=`<span class="eyebrow">SESSION RECORD</span><h2>Your observations.</h2><div class="record-stats"><div><strong>${session.photos.length}</strong><span>Images</span></div><div><strong>${session.specimens.length}</strong><span>Containers</span></div><div><strong>${formatTime(session.procedureSeconds)}</strong><span>Active procedure</span></div></div><button class="secondary" data-action="gallery">Review image record ↗</button><button class="secondary" data-action="export">Download illustrated report ↓</button><button class="text-button" data-action="export-json">Download session data (JSON) ↓</button><h3>Event timeline</h3><div class="event-list">${session.events.slice(-24).reverse().map(e=>`<div><i></i><span><b>${esc(e.type.replaceAll('-',' '))}</b><small>${esc(e.detail)}</small></span></div>`).join('')||'<p>No events yet.</p>'}</div><p class="fineprint">Images and session records are saved locally in this browser. Starting a new case clears the previous case’s image store. No data is sent to an AI examiner.</p>`;}
function renderDebrief(el){const a=assess(session,config);el.innerHTML=`<span class="eyebrow">SESSION COMPLETE</span><h2>Reflect. Refine. Repeat.</h2><div class="debrief-number">${a.inspectedCount}<span>/ 8 regions documented</span></div><div class="feedback-block"><h3>Documentation to revisit</h3><p>${a.missingRegions.length?a.missingRegions.map(r=>REGION_NAMES[r]).join(', '):'All eight simplified regions were recorded.'}</p><p>${a.missingLandmarkPhotos.length} named photograph labels remain. ${a.missingFindings.length} case findings remain undocumented.</p></div><div class="feedback-block"><h3>Specimen review</h3><p>${a.missingSamples.length?a.missingSamples.map(f=>f.title).join('; '):'No outstanding sample-count targets in this exercise.'}</p></div><p>${esc(a.timeNote)}</p><p class="fineprint">${esc(a.qualityNote)} Sample counts do not prove correct biopsy distribution or histological adequacy.</p><button class="primary" data-action="export">Download your session report ↓</button><button class="secondary" data-action="cases">Choose another case →</button>`;}

function casesModal(){openModal(`<div class="modal-heading"><span class="eyebrow">CHOOSE YOUR NEXT PROCEDURE</span><h2>One examination.<br>Seven perspectives.</h2><p>Choose the disease scenario before entering with the scope. Each case includes a fictional patient, learning objectives and region-specific findings.</p></div><div class="case-grid">${cases.map((c,i)=>`<button class="case-tile ${selectedCase===c.id?'selected':''}" data-select-case="${c.id}"><span class="case-number">${String(i+1).padStart(2,'0')}</span><span class="case-tag">${esc(c.difficulty)}</span><div class="case-art case-art-${i}"><span></span><i></i></div><h3>${esc(c.title)}</h3><p>${esc(c.subtitle)}</p><span class="case-duration">${esc(c.duration)} <b>→</b></span></button>`).join('')}</div><div class="modal-footer"><p>Starting a new case replaces this device’s active session.<br>Export an existing session first if you want to keep its record.</p><button class="primary" data-action="new-session">Start selected case →</button></div>`,'CLINICAL SCENARIOS',true);}
async function newSession(){
  const c=cases.find(c=>c.id===selectedCase);sessionGeneration++;photosLoading=false;pendingScopeCheckpoint=null;pendingScopeSessionId=null;scopeReady=false;scope?.setEnabled(false);session=createSession(c.id);retainSessionPhotos(session.id).catch(()=>{});photoData.clear();currentPrep=null;closeModal();hideWelcome();setRoom('procedure');activeTab='mission';render();persist();
  prepareScope(c);
}
async function prepareScope(c,{checkpoint=pendingScopeSessionId===session?.id?pendingScopeCheckpoint:null}={}){
  const generation=++scopeLoadGeneration,sessionId=session?.id;
  const current=()=>generation===scopeLoadGeneration&&session?.id===sessionId;
  pendingScopeCheckpoint=checkpoint?structuredClone(checkpoint):null;pendingScopeSessionId=sessionId;
  loadingScope=true;scopeReady=false;$('#scope-loading').hidden=false;$('#scope-loading').textContent='Preparing the endoscopy model…';
  try {
    if(!scope) {
      scopeInit ??= createEndoscope({container:$('#endoscope-view'),onTelemetry:updateTelemetry,onError:showScopeError,quality:preferences.quality}).catch(error=>{scopeInit=null;throw error;});
      const runtime=await scopeInit;
      if(!scope) { scope=runtime; world?.setMonitorTexture(scope.canvas); }
    }
    if(!current())return false;
    const applied=await scope.loadCase(c.meshCaseIds);
    if(!applied||!current())return false;
    if(checkpoint)scope.restore(checkpoint);
    scope.setReducedMotion(preferences.reducedMotion);scopeReady=true;pendingScopeCheckpoint=null;pendingScopeSessionId=null;$('#scope-loading').hidden=true;persist();
    return true;
  }catch(error){if(current())showScopeError(error.message);return false;}
  finally{if(current()){loadingScope=false;syncControls();}}
}
function showScopeError(message){
 if(scopeReady&&scope){pendingScopeCheckpoint=scope.snapshot();pendingScopeSessionId=session?.id;}
 scopeReady=false;scope?.setEnabled(false);telemetry={...telemetry,visibility:0,dwell:0,drive:0,guide:'The endoscopic view is unavailable. Retry the view before continuing.'};
 if(session?.phase==='procedure')session.paused=true;
 $('#scope-loading').hidden=false;$('#scope-loading').innerHTML=`<p>${esc(message)}</p><button class="secondary" data-action="retry-scope">Retry endoscopic view</button>`;
 persist();render();toast(message,true);
}
function enterScope(){hideWelcome();room='procedure';view='scope';$('#scope-stage').hidden=false;$('#operator-console').hidden=false;document.body.classList.add('operating');world?.setRoom('procedure');world?.focusStation('patient');renderRooms();renderPanel();syncControls();}
function updateTelemetry(t){
  const regionChanged=telemetry.region!==t.region;telemetry=t;
  $('#scope-region').textContent=controlDemo?'Stomach · controls practice':REGION_NAMES[t.region];$('#scope-position').textContent=t.progress<.012?'AT ENTRY':`ILLUSTRATIVE ROUTE · ${Math.round(t.progress*100)}%`;
  $('#scope-state').textContent=session?.paused?'PROCEDURE PAUSED':t.contact?'STOP · REORIENT TIP':t.retroflex?'GASTRIC RETROFLEX VIEW':'DIRECT-VISION INSPECTION';
  $('#scope-timer').textContent=formatTime(session?.procedureSeconds||0);$('#visibility-label').textContent=t.visibility>.7?'Clear view':t.visibility>.5?'Improve visibility':'View obscured';
  $('#gas-meter').value=t.gas;$('#fluid-meter').value=t.fluid;$('#handle-wheel').style.transform=`rotate(${-t.pitch*100}deg)`;$('#handle-smallwheel').style.transform=`rotate(${-t.yaw*100}deg)`;
  for(const axis of ['pitch','yaw','roll']){if(document.activeElement!==$('#'+axis))$('#'+axis).value=t[axis];$('#'+axis+'-value').textContent=Math.round(t[axis]*180/Math.PI)+'°';}
  $('#retroflex-button').setAttribute('aria-pressed',String(t.retroflex));$('#retroflex-button').textContent=t.retroflex?'Release retroflexion':'Retroflex view';
  if($('#live-guidance'))$('#live-guidance').textContent=t.guide;
  if($('#guidance-card'))$('#guidance-card').classList.toggle('warning',t.contact||t.visibility<.55);
  if($('#coach-region'))$('#coach-region').textContent=REGION_NAMES[t.region];
  document.querySelectorAll('[data-region]').forEach(el=>{el.classList.toggle('current',el.dataset.region===t.region);el.querySelector('b').textContent=el.dataset.region===t.region?'HERE':'';});
  if(controlDemo){if(scopeReady&&!loadingScope&&!controlDemo.returning)controlDemo.lastPose={pitch:t.pitch,yaw:t.yaw,roll:t.roll};$('#scope-position').textContent='FIXED GASTRIC VIEW · NORMAL ANATOMY';$('#scope-state').textContent=controlDemo.state?.practicing?'YOUR TURN · ANGLE OR ROTATE':({pitch:'UP / DOWN · TIP ANGULATION',yaw:'LEFT / RIGHT · TIP ANGULATION',roll:'SHAFT ROTATION · VIEW ORIENTATION',centre:'RETURN TO NEUTRAL CONTROLS'}[controlDemo.state?.stepId]||'WATCH THE CONTROLS AND LIVE VIEW');$('#scope-timer').textContent='DEMO';controlDemo.controller?.updatePose?.(t);}
  $('#demo-wheel-pitch').style.transform=`rotate(${-t.pitch*100}deg)`;$('#demo-wheel-yaw').style.transform=`rotate(${-t.yaw*100}deg)`;
  if(regionChanged&&$('#photo-landmark'))$('#photo-landmark').innerHTML=photoOptions();
}
function pauseControlDemo(){if(controlDemo?.state&&!controlDemo.state.paused&&!controlDemo.returning)controlDemo.controller?.toggleMotion();}
async function beginControlDemo({startAfter=false}={}){
 if(controlDemo)return;
 if(!demoCanStart(session,{loading:loadingScope,photosLoading})){toast('Finish the active safety or specimen workflow and wait for loading before opening controls practice.',true);return;}
 const checkpoint=scopeReady?scope?.snapshot():pendingScopeSessionId===session?.id?pendingScopeCheckpoint:null;
 const returnState=demoReturnState({session,checkpoint,room,view,showIntro,startAfter});
 if(session?.phase==='procedure')dispatch({type:'PAUSE',value:true},true);
 const demo={returnState,controller:null,state:null,elapsed:0,returning:false};controlDemo=demo;
 closeModal();document.body.classList.add('controls-demo');enterScope();
 $('#coach-body').innerHTML='';
 const onStep=(step,state)=>{if(controlDemo!==demo)return;demo.state=state;demo.elapsed=state.paused&&preferences.reducedMotion?1.3:0;if(!state.practicing){demo.lastPose=demoPose(step.id,demo.elapsed);scope?.setDemonstrationPose(demo.lastPose);}syncControls();};
 demo.controller=mountControlDemo($('#coach-body'),{initialStep:'intro',initialPaused:preferences.reducedMotion,onStep,onFinish:()=>finishControlDemo(false),onSkip:()=>finishControlDemo(true),onMotionChange:state=>{demo.state=state;syncControls();}});
 const ready=await prepareScope({meshCaseIds:['normal']},{checkpoint:DEMO_CHECKPOINT});
 if(controlDemo!==demo)return;
 if(ready){scope.setOrientationOnly(true);demo.elapsed=demo.state.paused&&preferences.reducedMotion?1.3:0;if(!demo.state.practicing)scope.setDemonstrationPose(demoPose(demo.state.stepId,demo.elapsed));syncControls();}
}
async function finishControlDemo(skipped){
 const demo=controlDemo;if(!demo||demo.returning)return;
 demo.returning=true;demo.controller?.destroy();scope?.setEnabled(false);scope?.setOrientationOnly(false);
 $('#coach-body').innerHTML='<span class="eyebrow">CONTROLS PRACTICE COMPLETE</span><h2>Returning to your case.</h2><p>Your case position and record have been kept separately from this demonstration.</p>';
 syncControls();
 const restore=demo.returnState;
 let ready=true;
 if(session&&session.id===restore.sessionId)ready=await prepareScope(currentCase(),{checkpoint:restore.checkpoint});
 else {++scopeLoadGeneration;scope?.reset();scopeReady=false;loadingScope=false;$('#scope-loading').hidden=true;}
 if(controlDemo!==demo)return;
 controlDemo=null;document.body.classList.remove('controls-demo');if(ready&&scopeReady)updateTelemetry(scope.getTelemetry());syncControls();
 if(restore.startAfter&&ready&&session?.phase==='preparation'){
   if(dispatch({type:'START'}).ok){enterScope();toast('Controls practice complete. Begin the case at the oesophagus.');}
 }else{
   setRoom(restore.room);
   if(restore.view==='scope')enterScope();
   if(restore.showIntro){showIntro=true;$('#welcome').hidden=false;scope?.setEnabled(false);world?.setProcedureActive(true);}
   render();
   if(!session&&!skipped)casesModal();
   else if(session?.phase==='procedure')toast('Your case is restored and paused. Resume when ready.');
 }
 persist();lastTick=performance.now();
}
function formatTime(value){const n=Math.floor(value);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function patientModal(){const p=currentCase().patient;openModal(`<h2>${esc(p.name)}</h2><span class="pill">Fictional training patient</span><dl class="patient-details">${[['Age / sex',`${p.age} · ${p.sex}`],['Indication',p.indication],['History',p.history],['Medications',p.medications.join('; ')],['Allergies',p.allergies],['ASA teaching profile',p.asa],['Fasting',p.fasting],['Sedation plan',p.sedationPlan]].map(([a,b])=>`<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl><p class="fineprint">ASA class is supplied as a teaching assumption and still requires clinical assessment.</p><button class="primary" data-action="close-modal">Return to the suite →</button>`,'PATIENT ASSESSMENT');}
function prepModal(id){
  const s=preparationSteps.find(s=>s.id===id);currentPrep=id;const station={Patient:'patient','Infection prevention':'hygiene',Equipment:'equipment',Safety:'monitor'}[s.group];world?.focusStation(station);
  openModal(`<span class="eyebrow">${esc(s.group)}</span><h2>${esc(s.title)}</h2><p class="large-body">${esc(s.description)}</p>${id==='position'?`<div class="position-illustration"><span class="pillow"></span><span class="body"></span><span class="head"></span><b>LEFT LATERAL</b></div><p>Left side down, head neutral and supported, airway accessible. The room mannequin illustrates positioning.</p><label class="field-label">Patient position<select id="patient-position"><option value="">Select position…</option><option value="supine">Supine</option><option value="left-lateral" ${session.position==='left-lateral'?'selected':''}>Left lateral</option><option value="prone">Prone</option></select></label>`:''}${['identity','risk','fasting','medications','consent'].includes(id)?'<button class="secondary" data-action="patient">Read the fictional patient record ↗</button>':''}${id==='scope-function'?'<img class="equipment-reference" src="/training/assets/gastroscope-control.png" alt="AI-generated generic gastroscope control-head reference"><p class="fineprint">Synthetic instrument reference. Locate angulation wheels, valves, biopsy port and insertion tube; check the actual device instructions in practice.</p>':''}${sourceLinks(s.sourceIds)}<div class="checkpoint-note">Recording a check confirms this learning step. It is not evidence that you performed it on a real device or patient.</div><button class="primary" data-confirm-prep="${id}">${session.preparation.includes(id)?'Check recorded · Return':'Record completed check'} ✓</button>`,'PREPARATION CHECKPOINT');
}
function recoveryModal(id){const s=recoverySteps.find(x=>x.id===id);openModal(`<h2>${esc(s.title)}</h2><p class="large-body">${esc(s.description)}</p>${sourceLinks(s.sourceIds)}<button class="primary" data-confirm-recovery="${id}">Record checkpoint ✓</button>`,'RECOVERY CHECKPOINT');}

function curriculumModal(id=activeLesson){
  activeLesson=id;openModal('<div id="learning-studio"></div>','THEORY ROOM',true);$('#modal').classList.add('library-modal');
  learningStudio=mountLearning($('#learning-studio'),{lessons,sources,completed:Object.keys(completedLessons).filter(id=>completedLessons[id]),initialLesson:id,onComplete(lessonId){completedLessons[lessonId]=true;try{localStorage.setItem('lumen.lessons.v1',JSON.stringify(completedLessons));}catch{toast('Lesson completed. Browser storage is unavailable.');}},onClose:closeModal});
}
function biopsyModal(findingId){
  const f=currentCase().findings.find(f=>f.id===(session.biopsy.findingId||findingId));if(!f)return;
  if(['avoid','none'].includes(f.biopsy)){openModal(`<span class="pill ${f.biopsy==='avoid'?'danger':''}">${f.biopsy==='avoid'?'DO NOT BIOPSY':'SAMPLING DECISION'}</span><h2>${esc(f.title)}</h2><p class="large-body">${esc(f.action)}</p>${sourceLinks(f.sourceIds)}<button class="primary" data-action="close-modal">Return to the examination →</button>`,'BIOPSY SAFETY');return;}
  // Biopsy controls are an inline panel so the live view remains visible during the exercise.
  activeTab='findings';render();const count=session.biopsy.sampleCount||0,stage=session.biopsy.stage;
  const names={idle:['introduce','Introduce closed forceps'],introduced:['open','Open jaws under direct vision'],opened:['sample','Close jaws to obtain a sample'],sampled:['retract','Retract closed forceps'],retracted:['label','Label the specimen container']};
  const [step,label]=names[stage];
  $('#coach-body').innerHTML=`<span class="eyebrow">SUPERVISED SAMPLING EXERCISE</span><h2>${esc(f.title)}</h2><p>${esc(f.action)}</p><div class="sampling-stage"><span>${stage==='idle'?'READY':esc(stage.toUpperCase())}</span><strong>${count}</strong><small>fragments in current container</small></div><ol class="sampling-steps"><li>Introduce with jaws closed</li><li>Open at the visible target</li><li>Close to sample under supervision</li><li>Withdraw closed and retrieve tissue</li><li>Check patient, site and specimen label</li></ol>${stage==='retracted'?`<label class="field-label">Specimen site<select id="specimen-site"><option value="">Select anatomical site…</option>${REGIONS.map(r=>`<option value="${r}">${esc(REGION_NAMES[r])}</option>`).join('')}</select></label><label class="field-label">Container label<input id="specimen-label" maxlength="160" placeholder="Specific site and specimen description"></label><p class="fineprint">Patient: ${esc(currentCase().patient.name)}. Planned fragment count: ${f.sampleCount||'per protocol'}. Distribution and adequacy require expert review.</p>`:''}<button class="primary" data-sample-step="${step}" data-finding-id="${f.id}">${label} →</button>${stage==='retracted'?`<button class="secondary" data-sample-step="introduce" data-finding-id="${f.id}">Take another sample at this site</button>`:''}<button class="text-button" data-sample-step="cancel" data-finding-id="${f.id}">${count?'Account for sampled tissue before leaving':'Withdraw without sampling'}</button><p class="fineprint">The rendered forceps is a handling illustration. Target contact, tissue mechanics and biopsy distribution are not validated.</p>`;
}
function galleryModal(){openModal(`<h2>Your image record.</h2><p>Snapshots are synthetic views from this session. Photo labels are learner-entered and require review.</p><div class="photo-grid">${session.photos.map(p=>`<figure>${photoData.has(p.id)?`<img src="${photoData.get(p.id)}" alt="Synthetic endoscopic snapshot of ${esc(REGION_NAMES[p.region])}">`:'<div class="photo-placeholder">Image unavailable in browser storage</div>'}<figcaption>${esc(landmarks.find(l=>l.id===p.landmarkId)?.title||REGION_NAMES[p.region])}<small>${esc(p.id)} · ${p.retroflex?'Retroflex view':'Forward view'}</small></figcaption></figure>`).join('')||'<p>No images captured yet.</p>'}</div>`,'PHOTO DOCUMENTATION',true);}
function sourcesModal(){openModal(`<h2>Built on evidence.<br>Clear about its limits.</h2><p class="large-body">${esc(trainingNotice)}</p><div class="limits-grid"><section><h3>Clinical content</h3><p>The curriculum cites BSG/AUGIS, ESGE, ASGE and other primary guidance. Guideline differences are retained. A clinician has not independently validated this implementation.</p></section><section><h3>What the model approximates</h3><p>The upper-GI mesh, tissue, disease patterns, retroflex view and control-head interface are synthetic. Insertion uses a prescribed anatomical route; it does not reproduce calibrated shaft mechanics, resistance or haptic force. The oral and pharyngeal intubation phase is discussed, not geometrically simulated.</p></section><section><h3>What your record means</h3><p>Checks, photo labels, sample counts and coverage log your actions. They cannot certify diagnostic accuracy, mucosal inspection, biopsy distribution or readiness to perform endoscopy.</p></section><section><h3>Privacy & scope</h3><p>Fictional patients only. Progress is local to this browser. This release is single-user, with no live instructor, voice chat, account sync or lower-GI procedural simulator.</p></section></div><h3>Primary reference library</h3><div class="reference-list">${sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.title)}</span><small>${esc(s.organization||s.kind||'Clinical source')}${s.year?' · '+s.year:''} ↗</small></a>`).join('')}</div><p class="fineprint">Room and instrument images were generated for this project. Procedural shaders are synthetic. Unverified clinical media from the original repository is excluded. The comparison atlas contains unchanged publication figures with recorded Attribution licenses; its captions distinguish photographs from simulated views.</p>`,'EVIDENCE, PROVENANCE & LIMITS',true);}

function atlasModal(id){
  const related=clinicalAtlas.filter(x=>x.caseIds.includes(currentCase().id));
  const item=clinicalAtlas.find(x=>x.id===id)||related[0]||clinicalAtlas[0];
  openModal(`<div class="atlas-heading"><span class="eyebrow">REAL CLINICAL REFERENCE · SEPARATE FROM SIMULATION</span><h2>Learn from the clinical view.</h2><p>Compare published examples with the synthetic examination. The reference does not diagnose the fictional patient.</p></div><div class="clinical-atlas"><nav aria-label="Clinical photographs">${clinicalAtlas.map(x=>`<button data-atlas="${x.id}" aria-pressed="${x.id===item.id}">${esc(x.title)}${x.caseIds.includes(currentCase().id)?'<small>Related to this case</small>':''}</button>`).join('')}</nav><figure>${item.src?`<a href="${esc(item.src)}" target="_blank" rel="noopener"><img src="${esc(item.src)}" alt="${esc(item.alt)}"></a>`:'<div class="atlas-placeholder">This reference is available at the publisher.</div>'}<figcaption><h3>${esc(item.title)}</h3><p>${esc(item.caption)}</p><p>${esc(item.notes)}</p><small>${esc(item.credit)}</small><div class="source-links"><a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.sourceTitle)} ↗</a><a href="${esc(item.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(item.license)}</a></div></figcaption></figure></div>`,'CLINICAL IMAGE ATLAS',true);
}
const instrumentParts=[
 {id:'wheels',title:'Angulation wheels',top:20,left:48,text:'The large and small wheels tension separate steering wires to bend the distal tip in two planes. Tip angulation changes where you look. Coordinate it with gentle insertion and shaft rotation under direct vision.',lesson:'scope-controls'},
 {id:'valves',title:'Air / water and suction',top:20,left:66,text:'Separate valves control air/water and suction through dedicated channels. Confirm valve identity and operation using the device instructions; colors and geometry vary by manufacturer. Use the minimum insufflation needed for inspection and suction with a visible, safe tip position.',lesson:'suction-fluids'},
 {id:'port',title:'Instrument channel port',top:48,left:63,text:'The accessory port allows compatible closed biopsy forceps through the working channel. Introduce only under supervision, open at a visible target, close to sample, withdraw closed and retrieve tissue into a correctly identified container.',lesson:'findings-biopsy'},
 {id:'shaft',title:'Insertion tube',top:76,left:51,text:'The flexible insertion tube carries channels, steering wires, illumination and imaging connections. In real procedures its shape and torque influence tip motion. This simulator assists travel along an anatomical route and does not reproduce measured shaft forces.',lesson:'scope-physics'},
 {id:'optics',title:'Distal imaging system',top:91,left:36,text:'The distal tip houses the image sensor or optical system, objective lens, illumination windows and channel outlets. Lens wash restores the view; a clear view is essential before advancing, interpreting or sampling.',lesson:'scope-physics'},
];
function instrumentModal(){
 const part=instrumentParts.find(x=>x.id===inspectorPart)||instrumentParts[0];
 openModal(`<div class="atlas-heading"><span class="eyebrow">EQUIPMENT ORIENTATION</span><h2>Know the instrument in your hand.</h2><p>Select a component to explore its role. This generated reference represents a generic control head; actual device layouts vary.</p></div><div class="instrument-explorer"><div class="instrument-picture"><img src="/training/assets/scope-handpiece.png" alt="Generated generic gastroscope control head in a gloved left hand">${instrumentParts.slice(0,4).map((p,i)=>`<button style="top:${p.top}%;left:${p.left}%" data-instrument-part="${p.id}" aria-label="${esc(p.title)}" aria-pressed="${p.id===part.id}">${i+1}</button>`).join('')}</div><section><nav aria-label="Endoscope components">${instrumentParts.map((p,i)=>`<button data-instrument-part="${p.id}" aria-pressed="${p.id===part.id}"><span>0${i+1}</span>${esc(p.title)}</button>`).join('')}</nav><h3>${esc(part.title)}</h3><p>${esc(part.text)}</p><div class="checkpoint-note">On the procedure screen, angulation sliders, shaft rotation and hold controls operate the live simulated view. Release a control to stop; pause the procedure whenever needed.</div><button class="secondary" data-action="curriculum">Explore the equipment curriculum →</button></section></div>`,'INTERACTIVE INSTRUMENT GUIDE',true);
}

function handleStation(id){hideWelcome();if(id==='curriculum')curriculumModal();else if(id==='patient')patientModal();else if(id==='scope'){if(session?.phase==='procedure')enterScope();else if(session?.phase==='preparation')prepModal('scope-function');else casesModal();}else if(id==='equipment')session?.phase==='preparation'?prepModal('reprocessing'):instrumentModal();else if(id==='hygiene')session?.phase==='preparation'?prepModal('hygiene'):curriculumModal('hygiene-ppe');else if(id==='biopsy')session?.phase==='procedure'?(activeTab='findings',render()):curriculumModal('findings-biopsy');else if(id==='monitor')session?.phase==='preparation'?prepModal('monitoring'):curriculumModal('sedation-monitoring');else if(id==='recovery')session?.phase==='recovery'?renderPanel():curriculumModal('recovery');else if(id==='exit')setRoom('theory');}

document.addEventListener('click',async e=>{
  const button=e.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.room){setRoom(button.dataset.room);return;}
  if(button.dataset.station){world?.focusStation(button.dataset.station);handleStation(button.dataset.station);return;}
  if(button.dataset.tab){activeTab=button.dataset.tab;render();return;}
  if(button.dataset.selectCase){selectedCase=button.dataset.selectCase;casesModal();return;}
  if(button.dataset.phase){const p=button.dataset.phase;if(p==='procedure'&&session?.phase==='procedure')enterScope();else if(p==='briefing')patientModal();else if(p==='preparation')setRoom('procedure');else if(p==='recovery')setRoom('recovery');else renderPanel();return;}
  if(button.dataset.prep){prepModal(button.dataset.prep);return;}
  if(button.dataset.confirmPrep){const id=button.dataset.confirmPrep;if(id==='position'){const r=dispatch({type:'POSITION',value:$('#patient-position').value});if(!r.ok)return;}if(dispatch({type:'PREPARE',id}).ok){closeModal();toast('Preparation check recorded.');}return;}
  if(button.dataset.recovery){recoveryModal(button.dataset.recovery);return;}
  if(button.dataset.confirmRecovery){if(dispatch({type:'RECOVER',id:button.dataset.confirmRecovery}).ok)closeModal();return;}
  if(button.dataset.lesson){curriculumModal(button.dataset.lesson);return;}
  if(button.dataset.answer!==undefined){const l=lessons.find(l=>l.id===activeLesson),correct=Number(button.dataset.answer)===l.question.correctIndex;$('#answer-feedback').textContent=(correct?'Correct. ':'Revisit this. ')+l.question.explanation;button.classList.toggle('correct',correct);button.classList.toggle('incorrect',!correct);if(correct){completedLessons[l.id]=true;try{localStorage.setItem('lumen.lessons.v1',JSON.stringify(completedLessons));}catch{}}return;}
  if(button.dataset.finding){if(dispatch({type:'FINDING',id:button.dataset.finding}).ok)toast('Finding documented.');return;}
  if(button.dataset.biopsy){biopsyModal(button.dataset.biopsy);return;}
  if(button.dataset.response){dispatch({type:'RESPOND',id:button.dataset.response});return;}
  if(button.dataset.sampleStep){const step=button.dataset.sampleStep,id=button.dataset.findingId;const r=dispatch({type:'BIOPSY',step,findingId:id,label:$('#specimen-label')?.value,site:$('#specimen-site')?.value});if(r.ok){scope?.setTool(session.biopsy.stage);if(['label','cancel'].includes(step)){toast(step==='label'?'Labeled specimen recorded.':'Accessory withdrawn.');render();}else biopsyModal(id);}return;}
  const action=button.dataset.action;
  if(action==='control-demo'){closeModal();await beginControlDemo();return;}
  if(action==='home'){showIntro=true;$('#welcome').hidden=false;scope?.setEnabled(false);world?.setProcedureActive(true);return;}
  if(action==='cases'){casesModal();return;}
  if(action==='new-session'){await newSession();return;}
  if(action==='close-modal'){closeModal();return;}
  if(action==='curriculum'){curriculumModal();return;}
  if(action==='atlas'){atlasModal();return;}
  if(action==='instrument'){instrumentModal();return;}
  if(button.dataset.atlas){atlasModal(button.dataset.atlas);return;}
  if(button.dataset.instrumentPart){inspectorPart=button.dataset.instrumentPart;instrumentModal();return;}
  if(['sources','limits'].includes(action)){sourcesModal();return;}
  if(action==='patient'){patientModal();return;}
  if(action==='brief'){if(dispatch({type:'BRIEF'}).ok)setRoom('procedure');return;}
  if(action==='start'){if(!scopeReady){toast(loadingScope?'The model is still loading.':'Load the endoscopic model before starting.',true);if(!loadingScope)prepareScope(currentCase());return;}const check=transition(session,{type:'START'},config);if(!check.ok){toast(check.message,true);return;}await beginControlDemo({startAfter:true});return;}
  if(action==='scope-view'){enterScope();return;}
  if(action==='room-view'){setRoom('procedure');return;}
  if(action==='retry-scope'){if(loadingScope)return;const lastDemoPose=controlDemo?.lastPose;const checkpoint=pendingScopeSessionId===session?.id&&pendingScopeCheckpoint?pendingScopeCheckpoint:scope?.snapshot();scope?.dispose();scope=null;scopeInit=null;const ready=await prepareScope(controlDemo&&!controlDemo.returning?{meshCaseIds:['normal']}:currentCase(),{checkpoint:controlDemo&&!controlDemo.returning?DEMO_CHECKPOINT:checkpoint});if(ready&&controlDemo&&!controlDemo.returning){scope.setOrientationOnly(true);controlDemo.elapsed=0;scope.setDemonstrationPose(lastDemoPose||demoPose(controlDemo.state?.stepId,preferences.reducedMotion?1.3:0));syncControls();}return;}
  if(action==='pause'){dispatch({type:'PAUSE',value:!session.paused});return;}
  if(action==='centre'){scope?.centre();return;}
  if(action==='retroflex'){const r=scope?.setRetroflex(!telemetry.retroflex);if(r&&!r.ok)toast(r.message,true);return;}
  if(action==='observe'){if(dispatch({type:'OBSERVE'}).ok)toast('Region documented. Capture representative views as well.');return;}
  if(action==='photo'){if(!scopeReady||!scope||photosLoading){toast('Wait for the endoscopic view and saved images to finish loading.',true);return;}const label=$('#photo-landmark')?.value;let pixels;try{pixels=scope.capture();if(!validCapture(pixels))throw Error('Invalid capture');}catch{toast('The image could not be captured. Retry the endoscopic view.',true);return;}if(dispatch({type:'PHOTO',landmarkId:label}).ok){const photoId=session.photos.at(-1).id,sessionId=session.id;photoData.set(photoId,pixels);savePhoto(sessionId,photoId,pixels).catch(()=>{if(session?.id===sessionId)toast('Image captured for this visit. Persistent photo storage is unavailable.',true);});toast('Image captured and labeled.');}return;}
  if(action==='drill'){if(dispatch({type:'DRILL'}).ok){$('#spo2').innerHTML='88<span>%</span>';activeTab='mission';render();toast('Scripted safety drill started. Follow the team response.');}return;}
  if(action==='resolve'){if(dispatch({type:'RESOLVE'}).ok){$('#spo2').innerHTML='98<span>%</span>';toast('Safety response recorded. The scripted scenario is reset.');}return;}
  if(action==='end'){if(dispatch({type:'END'}).ok){scope?.setEnabled(false);setRoom('recovery');activeTab='mission';render();}return;}
  if(action==='finish'){const text=$('#procedure-report')?.value||session.report;dispatch({type:'REPORT',text},true);if(dispatch({type:'FINISH'}).ok){setRoom('recovery');render();}return;}
  if(['gallery','export','export-json'].includes(action)&&photosLoading){toast('Saved images are still loading. The complete record will be available shortly.');return;}
  if(action==='gallery'){galleryModal();return;}
  if(action==='export'||action==='export-json'){if(!session)return;const html=action==='export',data=html?buildReportHTML(session,config,photoData,sources):JSON.stringify(exportReport(session,config),null,2);const url=URL.createObjectURL(new Blob([data],{type:html?'text/html':'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${session.id}-report.${html?'html':'json'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(html?'Illustrated report downloaded. Open it to read or print.':'Session data downloaded.');return;}
  if(action==='resume'&&saved){
    if(photosLoading){toast('Your session is still loading.');return;}
    const checkpoint=structuredClone(saved),restored=restoreSession(checkpoint.session,config);
    if(!restored){toast('This saved session is unavailable. Start a new case.',true);return;}
    const generation=++sessionGeneration,sessionId=restored.id;
    session=restored;selectedCase=session.caseId;photosLoading=true;photoData=new Map();scopeReady=false;scope?.setEnabled(false);hideWelcome();closeModal();setRoom(session.phase==='recovery'||session.phase==='debrief'?'recovery':'procedure');render();
    const images=loadSessionImages(loadPhotos,sessionId);
    await prepareScope(currentCase(),{checkpoint:checkpoint.scope});
    const result=await images;
    if(generation!==sessionGeneration||session?.id!==sessionId)return;
    photoData=result.photos;photosLoading=false;
    if(result.error)toast('Image storage unavailable; saved labels are retained.');
    if(session.phase==='procedure')enterScope();persist();render();
    if(!result.error)toast('Session restored. Resume when you are ready.');return;
  }
  if(action==='settings'){openModal(`<h2>Make the room yours.</h2><label class="field-label">Rendering quality<select id="quality-setting"><option value="low" ${preferences.quality==='low'?'selected':''}>Low · lighter on the device</option><option value="balanced" ${preferences.quality==='balanced'?'selected':''}>Balanced</option><option value="high" ${preferences.quality==='high'?'selected':''}>High</option></select></label><label class="toggle-row"><input id="motion-setting" type="checkbox" ${preferences.reducedMotion?'checked':''}> Reduce animated tissue motion</label><label class="toggle-row"><input id="sound-setting" type="checkbox" ${!muted?'checked':''}> Enable a subtle simulated monitor tone</label><p class="fineprint">Sound is generated locally. There is no microphone or voice connection.</p><button class="primary" data-action="close-modal">Return to the suite →</button>`,'SETTINGS');return;}
  if(action==='help'){openModal(`<h2>Your hands. Your view.</h2><button class="primary" data-action="control-demo">Watch the controls in the stomach →</button><div class="help-grid"><section><h3>Walk through the suite</h3><p>WASD or arrow keys to move. Drag in the room to look. E interacts with a nearby station. Use the room tabs or station buttons for direct access. Shift moves faster.</p></section><section><h3>Operate the scope</h3><p>W advances; S withdraws. Drag or arrow keys angle the tip. Q/E rotate the shaft view. Use the visible sliders for precise control. C centres the controls.</p></section><section><h3>Clear the view</h3><p>Hold I to insufflate, J to irrigate, K to suction and L to wash the lens. All functions have on-screen controls. Release to stop.</p></section><section><h3>Document the survey</h3><p>Pause to inspect. Document each region and select a photo label before capturing. Review case findings and biopsy decisions in the Findings tab. Release retroflexion and withdraw before recovery.</p></section></div><p class="fineprint">This is route-assisted visual practice; it does not reproduce the forces, shaft looping, oral intubation or full manual mechanics of a real endoscope.</p>`,'CONTROLS & ACCESSIBILITY');return;}
  if(action==='fullscreen'){try{if(!document.fullscreenElement)await $('.simulation-stage').requestFullscreen();else await document.exitFullscreen();}catch{toast('Full-screen mode is unavailable in this browser.',true);}return;}
});

for(const axis of ['pitch','yaw','roll'])$('#'+axis).addEventListener('input',e=>scope?.setAngle(axis,Number(e.target.value)));
document.addEventListener('change',e=>{
  if(e.target.id==='quality-setting'){preferences.quality=e.target.value;world?.setQuality(preferences.quality);scope?.setQuality(preferences.quality);}
  if(e.target.id==='motion-setting'){preferences.reducedMotion=e.target.checked;scope?.setReducedMotion(preferences.reducedMotion);document.body.classList.toggle('reduced-motion',preferences.reducedMotion);}
  if(e.target.id==='sound-setting'){muted=!e.target.checked;world?.setMuted(muted);if(!muted){try{audioContext??=new AudioContext();audioContext.resume();}catch{muted=true;toast('Audio is unavailable in this browser.');}}}
  if(e.target.id==='procedure-report')dispatch({type:'REPORT',text:e.target.value},true);
});
document.querySelectorAll('[data-hold]').forEach(b=>{
  const code=b.dataset.hold;
  const down=e=>{e.preventDefault();if(e.pointerId!==undefined)b.setPointerCapture(e.pointerId);scope?.setHeld(code,true);b.classList.add('held');};
  const up=()=>{scope?.setHeld(code,false);b.classList.remove('held');};
  b.addEventListener('pointerdown',down);for(const name of ['pointerup','pointercancel','lostpointercapture','blur'])b.addEventListener(name,up);
  b.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key))down(e);});b.addEventListener('keyup',up);
});
// Touch movement uses the same room key contract; it never drives the endoscope.
document.querySelectorAll('[data-walk]').forEach(b=>{const send=type=>window.dispatchEvent(new KeyboardEvent(type,{code:b.dataset.walk,key:b.dataset.walk,bubbles:true}));b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);send('keydown');});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>send('keyup'));});
window.addEventListener('beforeunload',persist);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseControlDemo();if(document.hidden&&session?.phase==='procedure')dispatch({type:'PAUSE',value:true},true);lastFrame=performance.now();});

function beep(){if(controlDemo||muted||!audioContext||session?.phase!=='procedure'||session.paused||view!=='scope')return;const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=session.emergency?450:780;g.gain.setValueAtTime(.025,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.07);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.075);}
let beepClock=0;
function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000);lastFrame=now;if(!document.hidden){if(controlDemo&&!controlDemo.returning&&scopeReady&&!loadingScope&&!$('#modal').open&&controlDemo.state&&!controlDemo.state.practicing&&!controlDemo.state.paused){controlDemo.elapsed+=dt;const pose=demoPose(controlDemo.state.stepId,controlDemo.elapsed);if(pose)scope?.setDemonstrationPose(pose);}if(scope&&(view==='scope'||room==='procedure')&&!showIntro)scope.update(dt);if(!controlDemo&&session&&now-lastTick>1000){dispatch({type:'TICK',dt:1,active:view==='scope'&&!showIntro&&!$('#modal').open&&scopeReady},true);lastTick=now;}if(now-lastSave>4000){persist();lastSave=now;}beepClock+=dt;if(beepClock>.83){beepClock=0;beep();}}raf=requestAnimationFrame(frame);}
try {
  world=createWorld({container:$('#world-view'),onInteract:item=>handleStation(item.id),onLocation:location=>{roomPos=location;if(view==='world'&&room!==location.room){room=location.room;renderRooms();}document.querySelectorAll('[data-map-room]').forEach(b=>b.classList.toggle('active',b.dataset.mapRoom===location.room));$('#map-dot').style.left=`${Math.max(2,Math.min(97,(location.x+12)/24*100))}%`;$('#map-dot').style.top=`${Math.max(30,Math.min(80,(location.z+4)/8*100))}%`;},quality:preferences.quality});
}catch(error){$('#stage-error').hidden=false;$('#stage-error').innerHTML=`<h2>3D view unavailable</h2><p>${esc(error.message)}</p><p>You can still use the learning library and case preparation.</p><button class="primary" data-action="curriculum">Open the learning library →</button>`;}
render();raf=requestAnimationFrame(frame);
window.addEventListener('pagehide',event=>{if(session?.phase==='procedure')session.paused=true;scope?.setEnabled(false);world?.setProcedureActive(true);persist();if(!event.persisted){cancelAnimationFrame(raf);scope?.dispose();world?.dispose();audioContext?.close();}});
window.addEventListener('pageshow',event=>{if(event.persisted){lastFrame=performance.now();lastTick=lastFrame;render();}});
window.addEventListener('blur',()=>{pauseControlDemo();if(session?.phase==='procedure'&&!session.paused)dispatch({type:'PAUSE',value:true},true);});
