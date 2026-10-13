/** Deterministic educational workflow. No physiological prediction or competence certification. */
export const SESSION_VERSION = 1;
export const PHASES = ['briefing', 'preparation', 'procedure', 'recovery', 'debrief'];
export const REGIONS = ['entry', 'cardia', 'fundus', 'body', 'antrum', 'pylorus', 'bulb', 'descending'];
export const REGION_NAMES = { entry: 'Oesophagus', cardia: 'GOJ / cardia', fundus: 'Fundus · retroflex view', body: 'Gastric body', antrum: 'Antrum', pylorus: 'Pylorus', bulb: 'Duodenal bulb', descending: 'Second duodenum' };

export function createSession(caseId, mode = 'guided', now = Date.now()) {
  return { version: SESSION_VERSION, id: `lumen-${now}`, caseId, mode, phase: 'briefing', startedAt: now,
    preparation: [], recovery: [], position: null, observations: [], photos: [], findings: [], specimens: [],
    biopsy: { stage: 'idle', findingId: null, sampleCount: 0 }, emergency: null, events: [], elapsed: 0, procedureSeconds: 0,
    report: '', submitted: false, paused: false };
}

function result(session, ok = true, message = '') { return { session, ok, message }; }
function event(s, type, detail, now) { s.events.push({ type, detail, at: now }); if (s.events.length > 400) s.events.shift(); }
const unique = (items, value) => items.includes(value) ? items : [...items, value];
const validTelemetry = t => t && Number.isFinite(t.progress) && Number.isFinite(t.visibility) && Number.isFinite(t.dwell) && t.progress >= 0 && t.progress <= 1 && t.visibility >= 0 && t.visibility <= 1 && t.dwell >= 0 && typeof t.contact==='boolean' && typeof t.retroflex==='boolean' && REGIONS.includes(t.region);

export function transition(current, action, config) {
  const s = structuredClone(current), now = action.now ?? Date.now();
  const fail = message => result(current, false, message);
  const item = config.cases.find(c => c.id === s.caseId);
  if (!item) return fail('This case is unavailable. Start a new session.');
  const requiredPrep = config.preparationSteps.map(x => x.id), requiredRecovery = config.recoverySteps.map(x => x.id);
  switch (action.type) {
    case 'BRIEF':
      if (s.phase !== 'briefing') return fail('The briefing is already complete.');
      s.phase = 'preparation'; event(s, 'briefing', item.title, now); break;
    case 'POSITION':
      if (s.phase !== 'preparation') return fail('Position the patient during preparation.');
      if (action.value !== 'left-lateral') return fail('For this routine upper-EGD scenario, choose left lateral with airway access. Other positions require a clinical reason and team plan.');
      s.position = action.value; event(s, 'position', 'Left lateral; airway accessible', now); break;
    case 'PREPARE':
      if (s.phase !== 'preparation' || !requiredPrep.includes(action.id)) return fail('This preparation action is unavailable.');
      if (/position/i.test(action.id) && s.position !== 'left-lateral') return fail('Set the patient to left lateral first.');
      s.preparation = unique(s.preparation, action.id); event(s, 'preparation', action.id, now); break;
    case 'START': {
      if (s.phase !== 'preparation') return fail('Complete the case briefing and preparation first.');
      const missing = requiredPrep.filter(id => !s.preparation.includes(id));
      if (missing.length || s.position !== 'left-lateral') return fail(`Complete ${missing.length} remaining safety checks and confirm left-lateral positioning before insertion.`);
      s.phase = 'procedure'; event(s, 'procedure-start', 'Team ready; direct-vision insertion', now); break;
    }
    case 'TICK':
      if (!s.paused && Number.isFinite(action.dt)) {
        const dt = Math.max(0, Math.min(1, action.dt)); s.elapsed += dt;
        if (s.phase === 'procedure' && !s.emergency && action.active !== false) s.procedureSeconds += dt;
      } break;
    case 'PAUSE': s.paused = !!action.value; break;
    case 'OBSERVE': {
      if (s.phase !== 'procedure' || s.paused || s.emergency) return fail('Resume the procedure before documenting a landmark.');
      const t = action.telemetry;
      if (!validTelemetry(t) || t.visibility < .55 || t.contact) return fail('Obtain a clear, stable view before documenting this landmark.');
      if (t.dwell < 2) return fail('Pause and inspect this region for at least two seconds before documenting it.');
      if (t.region === 'fundus' && !t.retroflex) return fail('Inspect the fundus in a gastric retroflex view before documenting it.');
      s.observations = unique(s.observations, t.region); event(s, 'landmark', t.region, now); break;
    }
    case 'PHOTO': {
      if (s.phase !== 'procedure' || s.paused || s.emergency) return fail('Photography is available during an active examination.');
      const t = action.telemetry;
      if (!validTelemetry(t) || t.visibility < .55 || t.contact) return fail('Clear the view and centre the lumen before capturing an image.');
      if (t.dwell < 2 || (t.region === 'fundus' && !t.retroflex)) return fail('Inspect a stable view for two seconds; fundus documentation requires gastric retroflexion.');
      if (s.photos.length >= 50) return fail('The session photo limit is 50. Continue documenting observations.');
      const landmark = config.landmarks?.find(l => l.id === action.landmarkId);
      if (action.landmarkId && (!landmark || landmark.runtimeRegion !== t.region)) return fail('The photograph label must match the current anatomical region.');
      s.photos.push({ landmarkId: landmark?.id || null, id: `photo-${s.photos.length + 1}`, region: t.region, at: now, retroflex: !!t.retroflex });
      event(s, 'photo', t.region, now); break;
    }
    case 'FINDING': {
      if (s.phase !== 'procedure' || s.paused || s.emergency) return fail('Findings are recorded during an active examination.');
      const f = item.findings.find(x => x.id === action.id), t = action.telemetry;
      if (!f || !validTelemetry(t) || f.region !== t.region) return fail('Inspect the finding in its anatomical region before recording it.');
      if (t.visibility < .55 || t.contact || t.dwell < 2) return fail('Get a clear, stable view of the finding first.');
      s.findings = unique(s.findings, f.id); event(s, 'finding', f.title, now); break;
    }
    case 'BIOPSY': {
      if (s.phase !== 'procedure' || s.paused || s.emergency) return fail('Sampling is unavailable while the procedure is paused or interrupted.');
      const stage = s.biopsy.stage;
      if (action.step === 'cancel') { if (s.biopsy.sampleCount > 0) return fail('A sample has been collected. Retract, account for it and label the specimen before continuing.'); s.biopsy = { stage: 'idle', findingId: null, sampleCount: 0 }; event(s, 'specimen-cancel', 'Forceps withdrawn without sampling', now); break; }
      // Enforce limits before introducing an instrument, so pending samples can
      // always be retracted and labelled rather than trapping the workflow.
      if(action.step==='introduce'&&stage==='idle'&&s.specimens.length>=100)return fail('The session specimen record is full. Continue documenting the examination and account for all recorded specimens.');
      if(action.step==='introduce'&&s.biopsy.sampleCount>=100)return fail('This teaching container has reached its 100-fragment record limit. Label it before taking more samples.');
      const f = item.findings.find(x => x.id === (s.biopsy.findingId || action.findingId));
      if (!f) return fail('Select a documented finding for the sampling exercise.');
      if (f.biopsy === 'avoid') return fail('Do not biopsy a suspected vascular lesion or varix. Stop and seek expert guidance.');
      if (!['required', 'optional'].includes(f.biopsy)) return fail('Routine biopsy is not indicated for this finding in the selected case.');
      if (!s.findings.includes(f.id)) return fail('Document the finding and its site before selecting biopsy forceps.');
      const steps = { idle: 'introduce', introduced: 'open', opened: 'sample', sampled: 'retract', retracted: 'label' };
      if (steps[stage] !== action.step && !(stage === 'retracted' && action.step === 'introduce')) return fail('Follow the forceps workflow in order.');
      if (action.step === 'introduce' && !s.photos.some(p => p.region === f.region)) return fail('Photograph the finding region before sampling.');
      if (['introduce', 'open', 'sample'].includes(action.step)) {
        const t = action.telemetry;
        if (!validTelemetry(t) || t.region !== f.region || t.visibility < .65 || t.contact || t.dwell<2) return fail('Keep a clear, stable view at the documented sampling site.');
      }
      if (action.step === 'sample' && s.biopsy.sampleCount >= 100) return fail('This teaching container has reached its 100-fragment record limit. Retract and label it before taking more samples.');
      if (action.step === 'label') {
        const label = String(action.label || '').trim().slice(0,160);
        if (action.site !== f.region) return fail('The selected specimen site must match the documented sampling site.');
        if (label.length < 4) return fail('Label the specimen with a specific anatomical site.');
        s.specimens.push({ id: `specimen-${s.specimens.length + 1}`, findingId: f.id, region: f.region, label, count: s.biopsy.sampleCount, patientId: item.patient.name, at: now });
        s.biopsy = { stage: 'idle', findingId: null, sampleCount: 0 }; event(s, 'specimen', `${f.title}: ${label}`, now);
      } else { s.biopsy = { stage: { introduce: 'introduced', open: 'opened', sample: 'sampled', retract: 'retracted' }[action.step], findingId: f.id, sampleCount: (s.biopsy.sampleCount || 0) + (action.step === 'sample' ? 1 : 0) }; }
      break;
    }
    case 'DRILL':
      if (s.phase !== 'procedure' || s.emergency || s.biopsy.stage !== 'idle') return fail('Start the drill during the procedure with instruments withdrawn.');
      s.emergency = { type: 'hypoxia', actions: [] }; event(s, 'drill', 'Scripted oxygen-desaturation scenario started', now); break;
    case 'RESPOND':
      if (!s.emergency || !['stop', 'help', 'airway', 'monitor'].includes(action.id)) return fail('No active drill action.');
      if (action.id !== 'stop' && !s.emergency.actions.includes('stop')) return fail('Stop procedural stimulation and request a pause first.');
      s.emergency.actions = unique(s.emergency.actions, action.id); event(s, 'drill-response', action.id, now); break;
    case 'RESOLVE':
      if (!s.emergency || ['stop','help','airway','monitor'].some(id => !s.emergency.actions.includes(id))) return fail('Complete the safety response and reassessment before resuming the exercise.');
      s.emergency = null; event(s, 'drill-complete', 'Simulation resumed after team reassessment', now); break;
    case 'END':
      if (s.phase !== 'procedure' || s.emergency) return fail('Address the active safety drill before ending the procedure.');
      if (s.biopsy.stage !== 'idle') return fail('Retract and account for the accessory, then label or cancel the specimen workflow.');
      if (!validTelemetry(action.telemetry) || action.telemetry.progress > .012 || action.telemetry.retroflex) return fail('Release retroflexion and withdraw to the entry before handing over to recovery.');
      s.phase = 'recovery'; event(s, 'procedure-end', 'Scope removed; recovery handover', now); break;
    case 'RECOVER':
      if (s.phase !== 'recovery' || !requiredRecovery.includes(action.id)) return fail('This recovery checkpoint is unavailable.');
      s.recovery = unique(s.recovery, action.id); event(s, 'recovery', action.id, now); break;
    case 'REPORT': s.report = String(action.text || '').slice(0, 6000); break;
    case 'FINISH':
      if (s.phase !== 'recovery' || requiredRecovery.some(id => !s.recovery.includes(id))) return fail('Complete all recovery and discharge checks.');
      if (s.report.trim().length < 20) return fail('Write a short procedure impression and follow-up plan before debriefing.');
      s.phase = 'debrief'; s.submitted = true; event(s, 'session-complete', 'Educational debrief available', now); break;
    default: return fail('Unknown training action.');
  }
  return result(s);
}

export function assess(session, config) {
  const item = config.cases.find(c => c.id === session.caseId);
  const missingRegions = REGIONS.filter(x => !session.observations.includes(x));
  const photographed = new Set(session.photos.map(x => x.region));
  const missingPhotos = REGIONS.filter(x => !photographed.has(x));
  const missingFindings = (item?.findings || []).filter(f => !session.findings.includes(f.id));
  const missingSamples = (item?.findings || []).filter(f => f.biopsy === 'required' && session.specimens.filter(s => s.findingId === f.id && s.region === f.region).reduce((n,s) => n + (s.count || 0), 0) < (f.sampleCount || 1));
  const missingLandmarkPhotos=(config.landmarks || []).filter(l=>l.photoRequired && !session.photos.some(p=>p.landmarkId===l.id));
  return { missingRegions, missingPhotos, missingLandmarkPhotos, missingFindings, missingSamples,
    inspectedCount: session.observations.length,
    preparationComplete: config.preparationSteps.every(x => session.preparation.includes(x.id)),
    recoveryComplete: config.recoverySteps.every(x => session.recovery.includes(x.id)),
    qualityNote: 'Coverage records and simulator events support reflection. They do not establish diagnostic accuracy, inspection quality or clinical competence.',
    timeNote: session.procedureSeconds < 420 ? 'This exercise was shorter than the ESGE ≥7-minute diagnostic examination quality measure. Duration alone does not establish adequate inspection.' : 'The elapsed time meets the ≥7-minute reference; adequate mucosal inspection still requires expert assessment.' };
}

export function restoreSession(raw, config) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw);
    if (!s || typeof s.id!=='string' || s.id.length>120 || !Number.isFinite(s.startedAt) || s.version !== SESSION_VERSION || !config.cases.some(c => c.id === s.caseId) || !PHASES.includes(s.phase)) return null;
    for (const key of ['preparation','recovery','observations','photos','findings','specimens','events']) if (!Array.isArray(s[key]) || s[key].length > 500) return null;
    if (typeof s.paused!=='boolean' || typeof s.submitted!=='boolean' || s.report?.length>6000) return null;
    if (!Number.isFinite(s.elapsed) || s.elapsed < 0 || !Number.isFinite(s.procedureSeconds) || s.procedureSeconds < 0 || s.procedureSeconds>s.elapsed || !s.biopsy || typeof s.report !== 'string') return null;
    const item=config.cases.find(c=>c.id===s.caseId);
    if(!s.preparation.every(id=>config.preparationSteps.some(x=>x.id===id)) || !s.recovery.every(id=>config.recoverySteps.some(x=>x.id===id)) || !s.observations.every(id=>REGIONS.includes(id)) || !s.findings.every(id=>item.findings.some(f=>f.id===id))) return null;
    if(!s.events.every(e=>e && typeof e.type==='string' && typeof e.detail==='string' && Number.isFinite(e.at))) return null;
    if(!s.photos.every(p=>p && typeof p.id==='string' && REGIONS.includes(p.region) && Number.isFinite(p.at) && typeof p.retroflex==='boolean' && (p.region!=='fundus'||p.retroflex) && (!p.landmarkId||config.landmarks?.some(l=>l.id===p.landmarkId&&l.runtimeRegion===p.region)))) return null;
    if(!s.specimens.every(p=>p && typeof p.id==='string' && Number.isFinite(p.at) && p.patientId===item.patient.name && typeof p.label==='string' && p.label.trim().length>=4 && p.label.length<=160 && Number.isInteger(p.count) && p.count>0 && p.count<=100 && s.findings.includes(p.findingId) && s.photos.some(photo=>photo.region===p.region) && item.findings.some(f=>f.id===p.findingId && f.region===p.region && ['required','optional'].includes(f.biopsy)))) return null;
    if(s.emergency && (s.emergency.type!=='hypoxia' || !Array.isArray(s.emergency.actions) || !s.emergency.actions.every(id=>['stop','help','airway','monitor'].includes(id)))) return null;
    if(!['idle','introduced','opened','sampled','retracted'].includes(s.biopsy.stage) || !Number.isInteger(s.biopsy.sampleCount) || s.biopsy.sampleCount<0 || s.biopsy.sampleCount>100) return null;
    for(const key of ['preparation','recovery','observations','findings'])s[key]=[...new Set(s[key])];
    if(['procedure','recovery','debrief'].includes(s.phase)&&(s.position!=='left-lateral'||config.preparationSteps.some(x=>!s.preparation.includes(x.id))))return null;
    if(s.phase==='debrief'&&(!s.submitted||s.report.trim().length<20||config.recoverySteps.some(x=>!s.recovery.includes(x.id))))return null;
    if(s.emergency&&s.phase!=='procedure')return null;
    if(s.photos.length>50||new Set(s.photos.map(p=>p.id)).size!==s.photos.length||s.specimens.length>100||new Set(s.specimens.map(p=>p.id)).size!==s.specimens.length)return null;
    s.events=s.events.slice(-400);
    if(s.biopsy.sampleCount>0) event(s,'interrupted-specimen','Unlabelled sample workflow was interrupted; repeat under supervision. No specimen credited.',Date.now());
    // A restored procedure is paused; unobserved in-flight instrument state is cancelled.
    return { ...s, paused: s.phase === 'procedure', emergency: s.emergency, biopsy: { stage: 'idle', findingId: null, sampleCount: 0 } };
  } catch { return null; }
}

export function exportReport(session, config) {
  const c = config.cases.find(x => x.id === session.caseId);
  return { product: 'Lumen Endoscopy Training', contentVersion: '2026-10-13', educationalOnly: true,
    case: c?.title, patient: 'Fictional training patient', session, assessment: assess(session, config),
    limitations: ['Synthetic anatomy and tissue', 'Route-assisted insertion, not calibrated shaft/haptic mechanics', 'No competence certification', 'Local browser progress only'] };
}
