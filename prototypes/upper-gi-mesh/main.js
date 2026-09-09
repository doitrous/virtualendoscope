import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { landmarks } from './anatomy.mjs';
import {referenceFiles} from './references.mjs';
import {tissueField,createTissueMaterial,dynamicField,updateFluids,deformGLSL,deformPoint} from './tissue.mjs';
import {createOptics,createFluidEffects} from './optics.mjs';
import {GuidedTrack} from './guided-track.mjs';
import {createGuidedScope} from './guided-scope.mjs';
import {videoObservations} from './video-observations.mjs';
import {createDiseaseModel} from './disease-model.mjs';
import {installDiseaseUI} from './disease-ui.mjs';
import {MeshAssets} from './mesh-assets.mjs';
import {Walkthrough,tourStages} from './walkthrough.mjs';
import {cases} from './disease-catalog.mjs';
const assetsReady=fetch('./assets/meshes/manifest.json').then(r=>{if(!r.ok)throw Error('Prepared mesh library missing');return r.json();}).then(manifest=>new MeshAssets(manifest));
const initialMeshesReady=assetsReady.then(store=>store.get(['normal']));
initialMeshesReady.catch(()=>{const loading=document.querySelector('#loading');if(loading)loading.textContent='The prepared model could not load. Please reload the page.';});

document.querySelector('#app').innerHTML=`
<header><a class="brand" href="#">◉ <b>LUMEN</b><span>ANATOMY LAB</span></a><div class="checkpoint"><i></i> CHECKPOINT 01 <span>Mesh & navigation</span></div><button id="reset">↺ Reset position</button></header>
<main><section class="scope-panel"><div class="panel-top"><span><i></i> ENDOSCOPIC VIEW</span><span>GEOMETRY STUDY / WHITE LIGHT</span></div><div id="scope"><div id="loading">Building stomach cavity…</div><div class="location"><small>APPROXIMATE TIP REGION</small><h1 id="region">Cardia</h1><span id="contact">Free movement</span></div><div class="crosshair">+</div><div class="scope-bottom"><span id="instruction">Drag to steer · W / S to move</span><span id="fps">— FPS</span></div></div><div class="scope-footer"><span class="dot"></span>Interactive shape prototype<span>Untextured · anatomical review pending</span></div></section>
<aside><div class="section-title"><span>01 / SPATIAL OVERVIEW</span><button id="cutaway" aria-pressed="true">Cutaway on</button></div><div id="overview"></div><p class="map-note"><span class="mint-dot"></span>Scope tip & viewing direction <span>Drag to orbit</span></p><div class="section-title"><span>02 / INSPECTION POSITIONS</span></div><div id="landmarks"></div><p class="muted">Jump between regions to inspect the cavity. Navigation is free within the mesh.</p><div class="section-title"><span>03 / SCOPE CONTROLS</span></div><dl><div><dt><kbd>Drag</kbd></dt><dd>Tip angulation</dd></div><div><dt><kbd>W</kbd><kbd>S</kbd></dt><dd>Advance / withdraw</dd></div><div><dt><kbd>A</kbd><kbd>D</kbd></dt><dd>Rotate the view</dd></div><div><dt><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></dt><dd>Keyboard angulation</dd></div></dl><div class="options"><label>Sensitivity <input id="sensitivity" type="range" min="0.3" max="2" value="1" step="0.1"></label><label><input id="invert" type="checkbox"> Invert vertical steering</label><label>Render quality <select id="quality"><option value="1">Balanced</option><option value=".7">Low</option><option value="1.5">High</option></select></label></div><p class="boundary">This checkpoint covers cavity shape and tip navigation. Flexible-shaft mechanics, textures, suction and irrigation are deferred.</p></aside></main>
<footer><span>UPPER GI / NORMAL ANATOMY STUDY</span><span>Browser prototype · Mouse + keyboard</span></footer>`;

const scope=document.querySelector('#scope'), overview=document.querySelector('#overview');
document.querySelector('#app').inert=true;
document.querySelector('.checkpoint').innerHTML='<i></i> GUIDED EXPLORATION <span>One route · look around</span>';
document.querySelector('.panel-top span:last-child').textContent='WHITE LIGHT / NORMAL ANATOMY';
document.querySelector('.scope-footer').innerHTML='<span class="dot"></span>Reference-guided tissue study<span>Not clinically validated</span>';
document.querySelector('.boundary').textContent='Guided visual learning mode. The route is prescribed; live shaft physics and manual insertion mechanics are disabled. Tissue and motion remain illustrative, not clinically validated.';
document.querySelector('.muted').textContent='One route through the upper GI tract. Stop anywhere and look around. Selecting a region moves to that point and stops.';
document.querySelector('#instruction').textContent='Drag to look · Space to continue / stop · C to centre view';
document.querySelector('.scope-bottom').insertAdjacentHTML('beforeend','<span id="motility" aria-live="polite">Motility active</span>');
document.querySelector('dl').innerHTML='<div><dt><kbd>Space</kbd></dt><dd>Continue / stop</dd></div><div><dt><kbd>Drag</kbd></dt><dd>Look around, even stopped</dd></div><div><dt><kbd>W / ↑</kbd><kbd>S / ↓</kbd></dt><dd>Hold to move forward / back</dd></div><div><dt><kbd>A / ←</kbd><kbd>D / →</kbd></dt><dd>Look left / right</dd></div><div><dt><kbd>T</kbd><kbd>G</kbd></dt><dd>Look up / down</dd></div><div><dt><kbd>C</kbd></dt><dd>Centre view</dd></div>';
document.querySelector('.options').insertAdjacentHTML('afterbegin','<label>Travel speed<select id="travel-speed"><option value=".25">Slow</option><option value=".45" selected>Steady</option><option value=".65">Brisk</option></select></label>');
document.querySelector('.scope-footer').insertAdjacentHTML('beforeend','<span id="mechanics">Guided route loading…</span>');
document.querySelector('.scope-footer').insertAdjacentHTML('beforeend','<button id="look-back">Look back at scope</button>');
document.querySelector('.options').insertAdjacentHTML('beforebegin',`<div class="section-title fluid-title">04 / SCOPE FUNCTIONS — HOLD</div><div id="functions"><button data-code="KeyI">I · Insufflate</button><button data-code="KeyJ">J · Irrigate</button><button data-code="KeyK">K · Suction</button><button data-code="KeyL">L · Lens wash</button></div><div class="fluid-status"><label>Distension <meter id="gas" min="0" max="1"></meter></label><label>Secretions <meter id="fluid" min="0" max="1"></meter></label></div><button id="references">Compare supplied references ↗</button>`);
document.body.insertAdjacentHTML('beforeend',`<dialog id="reference-dialog"><div class="reference-heading"><h2>Your reference library</h2><button id="close-reference">Close ✕</button></div><p>Original supplied views. These guide appearance, not a measured 3D reconstruction.</p><video controls preload="metadata" src="./references/motion/peristalsis.mp4"></video><p>Normal esophagus peristalsis · 21.3 seconds. Motion timing is interpreted; camera movement is not tissue motion.</p><div id="reference-grid"></div></dialog>`);
document.querySelector('#reference-grid').innerHTML=referenceFiles.map(file=>`<figure><img loading="lazy" src="${encodeURI(file)}" alt="${file.split('/').at(-1).replace('.jpg','')}"><figcaption>${file.split('/').at(-1).replace('.jpg','')}</figcaption></figure>`).join('');
const dialog=document.querySelector('#reference-dialog');
document.querySelector('#references').onclick=()=>{setPause(true);paused=true;dialog.showModal();};
document.querySelector('#close-reference').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{dialog.querySelector('video').pause();paused=document.hidden;last=performance.now();});
const video=dialog.querySelector('video');
video.insertAdjacentHTML('beforebegin','<label class="video-select">Video title <select id="video-select" aria-label="Reference video title"></select></label>');
video.nextElementSibling.id='video-note';
video.nextElementSibling.insertAdjacentHTML('afterend','<button id="inspect-video-region">Inspect this region in 3D</button>');
let selectedVideoRegion='entry';
try{
 const manifest=await fetch('./references/videos/manifest.json').then(r=>{if(!r.ok)throw Error('Video manifest unavailable');return r.json();});
 const unique=manifest.filter(v=>!v.duplicateOf),select=document.querySelector('#video-select');
 for(const item of unique){const option=document.createElement('option');option.value=item.id;option.textContent=item.title;select.append(option);}
 const selectVideo=()=>{const item=unique.find(v=>v.id===select.value),observation=videoObservations[item.id];video.pause();video.src=item.video;video.load();document.querySelector('#video-note').textContent=`${item.duration.toFixed(1)} seconds · ${observation.note}`;selectedVideoRegion=observation.region;document.querySelector('#inspect-video-region').disabled=!selectedVideoRegion;};
 select.onchange=selectVideo;select.value='07';selectVideo();
}catch(error){document.querySelector('#video-note').textContent='New video library unavailable. Original peristalsis reference remains available.';}
document.querySelector('#inspect-video-region').onclick=()=>{if(selectedVideoRegion){dialog.close();jump(selectedVideoRegion);}};
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setClearColor('#06080a');renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
scope.prepend(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Endoscopic cavity. Drag to steer. W or up advances, S or down withdraws. A and D or left and right steer.');
const mapRenderer=new T.WebGLRenderer({antialias:true,alpha:true});overview.append(mapRenderer.domElement);
mapRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
const scene=new T.Scene(), mapScene=new T.Scene();
const camera=new T.PerspectiveCamera(112,1,.025,40);scene.add(camera);
const tipLight=new T.PointLight('#fff2e7',5.2,12,1.7);tipLight.position.set(.10,.04,-.07);camera.add(tipLight);
const fillLight=new T.PointLight('#ffede1',1.6,9,1.7);fillLight.position.set(-.1,-.03,-.05);camera.add(fillLight);
scene.add(new T.AmbientLight('#d4a19a',.035));
let activeDiseaseModel=createDiseaseModel();
const meshAssets=await assetsReady,initialMeshes=await initialMeshesReady;meshAssets.activate(initialMeshes);
let geometry=initialMeshes.main;
const simulation={time:0,gas:0,fluid:.10,lens:0};
const tissueUniforms={simTime:{value:0},gas:{value:simulation.gas}};
let surface;
try{surface=await createTissueMaterial(tissueUniforms);}catch(error){document.querySelector('#loading').textContent='A tissue reference could not load. Reload after checking the local reference files.';throw error;}
const tissueMesh=new T.Mesh(geometry,surface);scene.add(tissueMesh);
const optics=createOptics(renderer,scene,camera),fluidEffects=createFluidEffects(scene,camera);
const mapMaterial=new T.MeshStandardMaterial({color:'#bf9490',roughness:.68,side:T.DoubleSide,clippingPlanes:[new T.Plane(new T.Vector3(0,0,-1),0)]});
mapMaterial.onBeforeCompile=shader=>{Object.assign(shader.uniforms,tissueUniforms);shader.vertexShader=deformGLSL+'\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','tissuePosition=position;vec3 transformed=deformTissue(position);');};
const organ=new T.Mesh(initialMeshes.map,mapMaterial);mapScene.add(organ);mapRenderer.localClippingEnabled=true;
mapScene.add(new T.HemisphereLight('#ffffff','#39434d',2));
const sun=new T.DirectionalLight('#ffe9e1',2.2);sun.position.set(3,7,10);mapScene.add(sun);
const mapCamera=new T.PerspectiveCamera(38,1,.1,100);mapCamera.position.set(0,1,24);
const orbit=new OrbitControls(mapCamera,mapRenderer.domElement);orbit.target.set(0,1,0);orbit.enableDamping=true;orbit.minDistance=13;orbit.maxDistance=40;orbit.update();
const track=new GuidedTrack();
document.querySelector('#look-back').onclick=()=>{yaw=Math.PI;pitch=0;};
const guidedScope=createGuidedScope(track);scene.add(guidedScope.mesh);
const mapShaft=new T.Mesh(guidedScope.mesh.geometry,guidedScope.mesh.material);mapShaft.frustumCulled=false;mapScene.add(mapShaft);
document.querySelector('#travel-speed').onchange=e=>track.speed=Number(e.target.value);
const routeLine=new T.Line(new T.BufferGeometry().setFromPoints(track.curve.getSpacedPoints(200)),new T.LineBasicMaterial({color:'#d13a63',transparent:true,opacity:.45,depthTest:false}));mapScene.add(routeLine);
const tip=new T.Mesh(new T.SphereGeometry(.17,16,12),new T.MeshBasicMaterial({color:'#82e2cb',depthTest:false}));tip.renderOrder=10;mapScene.add(tip);
const arrow=new T.ArrowHelper(new T.Vector3(0,-1,0),new T.Vector3(),1.2,0x82e2cb,.32,.17);mapScene.add(arrow);
let yaw=0,pitch=0,drag=false,paused=false,userPaused=true,quality=1,last=performance.now(),lastHud=last,lastMap=0,frames=0;
let adaptiveScale=1,slowFrames=0,walkthrough=null;
document.querySelector('header').insertAdjacentHTML('beforeend','<div class="session-actions"><button id="wave">Watch peristalsis</button><button id="pause" aria-pressed="false">Pause</button></div>');
function setPause(value){walkthrough?.stop();userPaused=value;track.playing=!value;paused=document.hidden||!!document.querySelector('dialog[open]');keys.clear();drag=false;last=performance.now();document.querySelector('#pause').textContent=value?'Continue':'Stop';document.querySelector('#pause').setAttribute('aria-pressed',String(!value));}
document.querySelector('#pause').onclick=()=>setPause(!userPaused);
document.querySelector('#wave').onclick=()=>{simulation.time=8;jump('antrum');};
document.querySelector('dl').insertAdjacentHTML('beforeend','<div><dt><kbd>Esc</kbd></dt><dd>Pause / regain control</dd></div>');
const keys=new Set(), direction=new T.Vector3();
function orient(){track.yaw=yaw;track.pitch=pitch;}
function jump(id){setPause(true);track.seek(id);yaw=pitch=0;const pose=track.pose(simulation.time,simulation.gas);camera.position.copy(pose.position);camera.quaternion.copy(pose.quaternion);keys.clear();document.querySelectorAll('[data-landmark]').forEach(b=>b.classList.toggle('active',b.dataset.landmark===id));}
document.querySelector('#landmarks').innerHTML=landmarks.map((l,i)=>`<button data-landmark="${l.id}"><small>${String(i+1).padStart(2,'0')}</small>${l.label}<span>↗</span></button>`).join('');
document.querySelectorAll('[data-landmark]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.landmark)));
document.querySelector('#reset').onclick=()=>jump('entry');
document.querySelector('#cutaway').onclick=e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'Cutaway on':'Cutaway off';mapMaterial.clippingPlanes=on?[new T.Plane(new T.Vector3(0,0,-1),0)]:[];};
function resize(){const w=scope.clientWidth,h=scope.clientHeight;renderer.setPixelRatio(Math.min(Math.min(devicePixelRatio,1.25)*quality,Math.sqrt(550000/(w*h)))*adaptiveScale);renderer.setSize(w,h);optics.composer.setPixelRatio(renderer.getPixelRatio());optics.composer.setSize(w,h);optics.uniforms.aspect.value=w/h;camera.aspect=w/h;camera.updateProjectionMatrix();mapRenderer.setSize(overview.clientWidth,overview.clientHeight);mapCamera.aspect=overview.clientWidth/overview.clientHeight;mapCamera.updateProjectionMatrix();}
document.querySelector('#quality').onchange=e=>{quality=Number(e.target.value);adaptiveScale=1;slowFrames=0;resize();};
const observer=new ResizeObserver(resize);observer.observe(scope);observer.observe(overview);
const sensitivity=document.querySelector('#sensitivity'),invert=document.querySelector('#invert');
function steer(x,y){yaw=T.MathUtils.clamp(yaw-x*.003*Number(sensitivity.value),-Math.PI,Math.PI);pitch=T.MathUtils.clamp(pitch-y*.003*Number(sensitivity.value)*(invert.checked?-1:1),-1.25,1.25);}
renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0||paused)return;drag=true;renderer.domElement.focus();renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(drag&&!paused)steer(T.MathUtils.clamp(e.movementX,-60,60),T.MathUtils.clamp(e.movementY,-60,60));});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,()=>drag=false);
const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyT','KeyG','KeyI','KeyJ','KeyK','KeyL'];
for(const button of document.querySelectorAll('[data-code]')){
 button.addEventListener('pointerdown',e=>{keys.add(button.dataset.code);button.setPointerCapture(e.pointerId);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.code));
 button.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();keys.add(button.dataset.code);}});
 button.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')keys.delete(button.dataset.code);});
 button.addEventListener('blur',()=>keys.delete(button.dataset.code));
}
window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Escape'){setPause(true);return;}if(e.code==='Space'&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat)setPause(!userPaused);return;}if(paused)return;if(codes.includes(e.code)){e.preventDefault();if(['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code)&&track.playing)setPause(true);keys.add(e.code);}if(e.code==='KeyC'){pitch=0;yaw=0;}});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>setPause(true));
document.addEventListener('visibilitychange',()=>{setPause(true);paused=document.hidden||dialog.open;});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;document.querySelector('#instruction').textContent='Graphics context lost. Reload to restore the cavity.';});
let caseLoadVersion=0;
const diseaseUI=await installDiseaseUI({
 preloadCase:ids=>meshAssets.preload(ids),
 stop:()=>{setPause(true);},
 modalClosed:()=>{paused=document.hidden||!!document.querySelector('dialog[open]');last=performance.now();},
 inspect:(id,caseId)=>{
  jump(id);if(!caseId||caseId==='normal')return;
  const targets={'reflux-b':[.15,4.4,.3],'reflux-d':[.15,4.4,.3],inlet:[.40,6.1,.15],crohn:[.35,5.3,.1],alcohol:[-2,-.5,.8],celiac:[5,-3.2,.35]};
  const p=targets[caseId]||activeDiseaseModel.nodules[0]?.p||activeDiseaseModel.pockets[0]?.p;
  if(p){const target=new T.Vector3(...deformPoint(...p,simulation.time,simulation.gas));const local=target.sub(camera.position).normalize().applyQuaternion(camera.quaternion.clone().invert());yaw=Math.atan2(-local.x,-local.z);pitch=T.MathUtils.clamp(Math.asin(local.y),-1.25,1.25);}
 },
 changeCase:async ids=>{
  const version=++caseLoadVersion,loaded=await meshAssets.get(ids);
  if(version!==caseLoadVersion){meshAssets.trim();return false;}
  geometry=loaded.main;activeDiseaseModel=createDiseaseModel(ids);tissueMesh.geometry=loaded.main;organ.geometry=loaded.map;meshAssets.activate(loaded);
  if(walkthrough){const selected=cases.find(c=>c.id===ids[0]);tourBanner.replaceChildren();const title=document.createElement('strong'),caption=document.createElement('span');title.textContent=selected.title;caption.textContent=selected.note.split('. ')[0];tourBanner.append(title,caption);tourBanner.hidden=false;walkthrough.notice=3.5;}
  return true;
 }
});
document.querySelector('header').insertAdjacentHTML('beforeend','<button id="walkthrough-button">Start walkthrough</button>');
scope.insertAdjacentHTML('beforeend','<div id="tour-caption" role="status" aria-live="polite" hidden></div>');
const tourMeshes=new Map(),tourModels=new Map(),tourBanner=document.querySelector('#tour-caption');
let tourSnapshot;
walkthrough=new Walkthrough({button:document.querySelector('#walkthrough-button'),banner:tourBanner,
 prepare:async version=>{
  caseLoadVersion++;keys.clear();drag=false;track.playing=false;userPaused=true;
  document.querySelector('#pause').textContent='Continue';document.querySelector('#pause').setAttribute('aria-pressed','false');
  const ids=[...new Set(tourStages.map(s=>s.id))];meshAssets.pinned=new Set(ids);let cursor=0;const prepared=new Map();
  await Promise.all(Array.from({length:3},async()=>{while(cursor<ids.length){const id=ids[cursor++];prepared.set(id,await meshAssets.get([id]));}}));
  if(walkthrough.version!==version){meshAssets.trim();return;}
  for(const [id,item] of prepared){tourMeshes.set(id,item);tourModels.set(id,createDiseaseModel([id]));}
 },
 begin:()=>{track.progress=0;yaw=pitch=0;track.yaw=track.pitch=0;simulation.gas=.7;simulation.time=9;paused=false;userPaused=false;document.querySelector('#pause').textContent='Stop';document.querySelector('#pause').setAttribute('aria-pressed','true');last=performance.now();camera.quaternion.copy(track.pose().quaternion);},
 resume:()=>{caseLoadVersion++;keys.clear();drag=false;track.playing=false;track.progress=tourSnapshot.progress;yaw=tourSnapshot.yaw;pitch=tourSnapshot.pitch;track.yaw=yaw;track.pitch=pitch;simulation.gas=tourSnapshot.gas;camera.quaternion.copy(tourSnapshot.quaternion);paused=false;userPaused=false;document.querySelector('#pause').textContent='Stop';document.querySelector('#pause').setAttribute('aria-pressed','true');last=performance.now();},
 show:stage=>{
  const item=tourMeshes.get(stage.id);geometry=item.main;tissueMesh.geometry=item.main;organ.geometry=item.map;activeDiseaseModel=tourModels.get(stage.id);meshAssets.activate(item);diseaseUI.presentCase(stage.id);
  tourBanner.replaceChildren();const title=document.createElement('strong'),caption=document.createElement('span');title.textContent=cases.find(c=>c.id===stage.id).title;caption.textContent=stage.caption;tourBanner.append(title,caption);
 },
 move:(state,dt)=>{
  track.progress=state.progress;
  // Stable forward-facing gaze: nearest-nodule targeting used to oscillate
  // between variceal columns. The route itself supplies the camera turns.
  const targetYaw=0,targetPitch=0;
  const step=Math.min(dt,.05)*.35;yaw+=T.MathUtils.clamp(targetYaw-yaw,-step,step);pitch+=T.MathUtils.clamp(targetPitch-pitch,-step,step);
 },
 finish:preserve=>{tourSnapshot={progress:track.progress,yaw,pitch,gas:simulation.gas,quaternion:camera.quaternion.clone()};track.playing=false;userPaused=true;document.querySelector('#pause').textContent='Continue';document.querySelector('#pause').setAttribute('aria-pressed','false');if(!preserve){meshAssets.pinned=null;tourMeshes.clear();tourModels.clear();meshAssets.trim();}}
});
// Manual interaction takes over immediately; backgrounding never fast-forwards.
renderer.domElement.addEventListener('pointerdown',()=>walkthrough.stop(),{capture:true});
window.addEventListener('keydown',e=>{if(codes.includes(e.code)||e.code==='KeyC')walkthrough.stop();},{capture:true});
document.querySelector('#look-back').addEventListener('click',()=>walkthrough.stop());
resize();if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
document.querySelector('#loading').remove();document.querySelector('#app').inert=false;jump('entry');resize();
// Small warm cache, not an unbounded download of all cases.
setTimeout(()=>meshAssets.preload(['reflux-b']),500);
function render(now){requestAnimationFrame(render);if(now-last<1000/60-1)return;const frameGap=now-last,dt=Math.min(frameGap/1000,1/30);last=now;if(paused)return;frames++;
  if(frameGap>40&&!document.hidden){slowFrames++;}else slowFrames=Math.max(0,slowFrames-1);
  if(slowFrames>=12&&adaptiveScale>.5){adaptiveScale=Math.max(.5,adaptiveScale*.8);slowFrames=0;resize();}
  simulation.time+=dt;
  walkthrough.update(Math.min(frameGap/1000,.05));
  const input={air:+keys.has('KeyI'),water:+keys.has('KeyJ'),suction:+keys.has('KeyK'),wash:+keys.has('KeyL')};
  const previousGas=simulation.gas;updateFluids(simulation,dt,input);if(!input.air&&!input.suction)simulation.gas=previousGas;tissueUniforms.simTime.value=simulation.time;tissueUniforms.gas.value=simulation.gas;
  steer(((keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0))*dt*150,((keys.has('KeyG')?1:0)-(keys.has('KeyT')?1:0))*dt*150);
  orient();
  const drive=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  if(!walkthrough.active)track.advance(dt,drive);const pose=track.pose(simulation.time,simulation.gas);
  guidedScope.update(simulation.gas);mapShaft.visible=guidedScope.mesh.visible;
  if(walkthrough.active)camera.quaternion.rotateTowards(pose.quaternion,Math.min(frameGap/1000,.05)*.75);else camera.quaternion.copy(pose.quaternion);camera.position.copy(pose.position);camera.getWorldDirection(direction);
  if(track.progress===1&&!userPaused)setPause(true);
  optics.uniforms.time.value=simulation.time;optics.uniforms.lens.value=simulation.lens;optics.uniforms.wash.value=input.wash;
  const exposure=T.MathUtils.clamp(.55-dynamicField(...camera.position.toArray(),simulation.time,simulation.gas)*.35,.45,1.3);
  renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,exposure,1-Math.exp(-dt*2));
  fluidEffects.update(dt,simulation,input,p=>dynamicField(p.x,p.y,p.z,simulation.time,simulation.gas));
  tip.position.copy(camera.position);arrow.position.copy(camera.position);arrow.setDirection(direction);
  orbit.update();optics.composer.render();if(now-lastMap>100){mapRenderer.render(mapScene,mapCamera);lastMap=now;}
  if(now-lastHud>400){document.querySelector('#fps').textContent=`${Math.round(frames*1000/(now-lastHud))} FPS`;frames=0;lastHud=now;
    const near=landmarks.reduce((a,b)=>camera.position.distanceToSquared(new T.Vector3(...a.position))<camera.position.distanceToSquared(new T.Vector3(...b.position))?a:b);
    document.querySelector('#region').textContent=near.label;document.querySelector('#contact').textContent=track.progress===1?'End of route':track.playing||drive?'Travelling slowly on the guided route':'Stopped — look around';
    if(walkthrough.active)document.querySelector('#region-select').value=near.id;
    document.querySelector('#mechanics').textContent=`Guided route · ${Math.round(track.progress*100)}%`;
    document.querySelector('#instruction').textContent=simulation.gas<.18?'Insufflate to open the lumen':'';
    const wavePhase=simulation.time%24;
    const motionLabel=wavePhase<7?'between waves':wavePhase<11?'approaching':wavePhase<18?'contraction':'relaxation';
    document.querySelector('#motility').textContent=`Antral peristalsis · ${motionLabel}`;
    document.querySelector('#gas').value=simulation.gas;document.querySelector('#fluid').value=simulation.fluid;
    document.querySelectorAll('[data-code]').forEach(b=>b.classList.toggle('held',keys.has(b.dataset.code)));
  }
}
requestAnimationFrame(render);
// Read-only diagnostics for browser verification; not a control API.
window.meshCheckpoint={getState:()=>({position:camera.position.toArray(),clearance:-dynamicField(...camera.position.toArray(),simulation.time,simulation.gas),triangles:geometry.attributes.position.count/3,quality,...simulation,referenceCount:referenceFiles.length,mode:'guided',progress:track.progress,playing:track.playing})};
