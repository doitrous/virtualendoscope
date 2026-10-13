import * as T from 'three';
import {MeshAssets} from '../prototypes/upper-gi-mesh/mesh-assets.mjs';
import {deformPoint, deformation, antralScale, collapseScale, updateFluids} from '../prototypes/upper-gi-mesh/tissue.mjs';
import {createFluidEffects, createOptics} from '../prototypes/upper-gi-mesh/optics.mjs';
import {createTrainingPathology} from './pathology.mjs';
import {createSyntheticTissue} from './synthetic-tissue.mjs';
import {refineGastricSurface} from './anatomy-surface.mjs';
import {normalizeScopeSnapshot,scopeAngle,scopeKeyAllowed,scopeAdvanceBlocked,scopeControlCodes,scopeToolStages} from './endoscope-state.mjs';

export const routeStops=[
  {id:'entry',p:[.17,6.7,0]}, {id:'cardia',p:[.05,3.25,0]},
  {id:'body',p:[-1.7,.2,0]}, {id:'antrum',p:[1.1,-2.4,0]},
  {id:'pylorus',p:[3.35,-2.3,0]}, {id:'bulb',p:[4.5,-2.2,0]},
  {id:'descending',p:[5,-4.15,0]},
];

export async function createEndoscope({container,onTelemetry=()=>{},onError=()=>{},quality='balanced'}) {
  let renderer;
  try {renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}
  catch {throw new Error('The 3D endoscopic view needs WebGL. Theory, case briefings and checklists remain available.');}
  renderer.setClearColor('#03080b');renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive endoscopic view. Drag to angle the tip. W and S advance and withdraw; Q and E rotate.');
  container.prepend(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(110,1,.025,35);scene.add(camera);
  const keyLight=new T.PointLight('#fff7f2',4.6,14,1.7);keyLight.position.set(.055,.025,-.015);camera.add(keyLight);
  const fill=new T.PointLight('#fff0e6',.85,8,1.7);fill.position.set(-.065,-.025,0);camera.add(fill);
  scene.add(new T.AmbientLight('#c9a69b',.025));
  const sim={time:0,gas:.36,fluid:.08,lens:0};
  const uniforms={simTime:{value:0},gas:{value:sim.gas},pathologyKind:{value:0},ulcerCentre:{value:new T.Vector3()}};
  let material;
  try { material=await createSyntheticTissue(uniforms); }
  catch(error){renderer.dispose();renderer.domElement.remove();throw new Error('The tissue material could not be loaded. Retry the endoscopic view.');}
  let store,organ,pathology=createTrainingPathology(),loadToken=0,disposed=false,contextLost=false;
  const curve=new T.CatmullRomCurve3(routeStops.map(s=>new T.Vector3(...s.p)),false,'centripetal');curve.arcLengthDivisions=1800;
  const length=curve.getLength();
  const locations=routeStops.map(s=>{let best=0,d=Infinity;for(let i=0;i<=1600;i++){const n=curve.getPointAt(i/1600).distanceToSquared(new T.Vector3(...s.p));if(n<d){best=i/1600;d=n;}}return best;});
  let progress=0,yaw=0,pitch=0,roll=0,retroflex=false,enabled=false,dwell=0,previousRegion='entry',telemetry={},hudClock=0;
  let drag=null,orientationOnly=false,qualityValue=quality,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keys=new Set(),held=new Set();
  const optics=createOptics(renderer,scene,camera),fluids=createFluidEffects(scene,camera);
  const scopeMaterial=new T.MeshPhysicalMaterial({color:'#263b3e',roughness:.26,clearcoat:.7});
  const shaft=new T.Mesh(new T.BufferGeometry(),scopeMaterial);scene.add(shaft);shaft.visible=false;
  const forceps=new T.Group();camera.add(forceps);forceps.position.set(.13,-.14,-.48);forceps.rotation.x=-.11;
  const toolMaterial=new T.MeshStandardMaterial({color:'#b5c4c6',metalness:.8,roughness:.24});
  const wire=new T.Mesh(new T.CylinderGeometry(.007,.007,.35,8),toolMaterial);wire.rotation.x=Math.PI/2;forceps.add(wire);
  const jaws=[-1,1].map(side=>{const jaw=new T.Mesh(new T.SphereGeometry(.018,12,8),toolMaterial);jaw.scale.set(.65,.7,1.5);jaw.position.set(side*.008,0,-.19);forceps.add(jaw);return jaw;});forceps.visible=false;
  let toolStage='idle',shaftClock=0;

  function inside(v){
    const a=antralScale(v.x,sim.time,sim.gas),qy=-2.3+(v.y+2.3)/a,qz=v.z/collapseScale(sim.gas)/a;
    const d=deformation(qy,sim.time,sim.gas);
    return pathology.field(d.center+(v.x-d.center)/d.scale,qy,qz/d.scale)*Math.min(a,d.scale)*collapseScale(sim.gas);
  }
  function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);const q={low:.7,balanced:1,high:1.35}[qualityValue]||1;renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)*q);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();optics.composer.setPixelRatio(renderer.getPixelRatio());optics.composer.setSize(w,h);optics.uniforms.aspect.value=w/h;}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  function clearInput(){keys.clear();held.clear();drag=null;}
  function keydown(e){if(!enabled||document.querySelector('dialog[open]')||!scopeKeyAllowed(e))return;e.preventDefault();keys.add(e.code);if(e.code==='KeyC'){yaw=pitch=roll=0;dwell=0;}}
  function keyup(e){keys.delete(e.code);}
  function pointerdown(e){if(!enabled||e.button!==0||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;drag={x:e.clientX,y:e.clientY,id:e.pointerId};renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.focus();}
  function pointermove(e){if(!drag||!enabled||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;yaw=T.MathUtils.clamp(yaw-(e.clientX-drag.x)*.0045,-1.5,1.5);pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.y)*.0045,-1.5,1.5);drag.x=e.clientX;drag.y=e.clientY;dwell=0;}
  function pointerup(){drag=null;}
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerup',pointerup);canvas.addEventListener('pointercancel',pointerup);canvas.addEventListener('lostpointercapture',pointerup);
  const lost=e=>{e.preventDefault();contextLost=true;clearInput();onError('The graphics context was interrupted. Reload the view to continue; your checkpoint is saved.');};canvas.addEventListener('webglcontextlost',lost);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
  try {const r=await fetch(new URL('../prototypes/upper-gi-mesh/assets/meshes/manifest.json',import.meta.url));if(!r.ok)throw Error('Mesh manifest unavailable');store=new MeshAssets(await r.json(),{limit:2});}
  catch(e){dispose();throw e;}

  async function loadCase(ids=['normal']) {
    const token=++loadToken;enabled=false;clearInput();
    const meshes=await store.get(ids);
    if(disposed||token!==loadToken)return false;
    if(contextLost)throw new Error('The graphics context was interrupted while loading. Retry the endoscopic view.');
    store.activate(meshes);pathology=createTrainingPathology(ids[0]);
    uniforms.pathologyKind.value=ids[0]==='barrett'?1:ids[0]==='gastric-ulcer'?2:0;
    uniforms.ulcerCentre.value.set(...pathology.centre);
    const visualGeometry=refineGastricSurface(meshes.main,{enabled:true});
    if(organ){organ.geometry.dispose();organ.geometry=visualGeometry;}else {organ=new T.Mesh(visualGeometry,material);scene.add(organ);}
    reset();return true;
  }
  function reset(){enabled=false;progress=yaw=pitch=roll=0;retroflex=false;dwell=0;toolStage='idle';sim.gas=.36;sim.fluid=.08;sim.lens=0;sim.time=0;clearInput();hudClock=.11;update(0);}
  function regionAt(){if(retroflex)return 'fundus';let index=0;for(let i=0;i<locations.length;i++){if(progress>=(i===0?0:(locations[i-1]+locations[i])/2))index=i;}return routeStops[index].id;}
  function viewPose(at){
    const p=curve.getPointAt(at),position=new T.Vector3(...deformPoint(p.x,p.y,p.z,sim.time,sim.gas));
    const target=retroflex?new T.Vector3(.05,3.8,0).sub(p).normalize():curve.getTangentAt(at);
    const quaternion=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(),target,new T.Vector3(0,0,1)));
    quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),roll));
    quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,0,'YXZ')));
    return {position,quaternion,direction:new T.Vector3(0,0,-1).applyQuaternion(quaternion)};
  }
  function update(dt){
    if(disposed||contextLost||!organ||document.hidden)return;
    if(!Number.isFinite(dt))return;
    dt=Math.min(.04,Math.max(0,dt));const moving=enabled;
    const key=code=>moving&&(keys.has(code)||held.has(code));
    let drive=(key('KeyW')?1:0)-(key('KeyS')?1:0);
    if(toolStage!=='idle'||retroflex||orientationOnly)drive=0;
    const steerX=(key('ArrowLeft')||key('KeyA')?1:0)-(key('ArrowRight')||key('KeyD')?1:0);
    const steerY=(key('ArrowUp')?1:0)-(key('ArrowDown')?1:0);
    const rotating=key('KeyQ')||key('KeyE');
    if(rotating||steerX||steerY)dwell=0;
    yaw=T.MathUtils.clamp(yaw+steerX*dt*.72,-1.5,1.5);pitch=T.MathUtils.clamp(pitch+steerY*dt*.72,-1.5,1.5);
    roll=scopeAngle('roll',roll+(Number(key('KeyQ'))-Number(key('KeyE')))*dt*.8);
    const input={air:+(!orientationOnly&&key('KeyI')),water:+(!orientationOnly&&key('KeyJ')),suction:+(!orientationOnly&&key('KeyK')),wash:+(!orientationOnly&&key('KeyL'))};
    if(moving&&!orientationOnly){updateFluids(sim,dt,input);if(!reducedMotion)sim.time=Math.min(86400,sim.time+dt);}
    let pose=viewPose(progress),contact=false;
    if(drive){
      const next=T.MathUtils.clamp(progress+drive*dt*.037,0,1),candidate=viewPose(next);
      // Check actual model clearance before advancing. Withdrawal remains available.
      contact=drive>0&&scopeAdvanceBlocked({yaw,pitch,gas:sim.gas,viewClearance:inside(pose.position.clone().addScaledVector(pose.direction,.3)),nextClearance:inside(candidate.position)});
      if(!contact){progress=next;pose=candidate;}dwell=0;
    }
    camera.position.copy(pose.position);camera.quaternion.copy(pose.quaternion);
    const nearby=inside(camera.position.clone().addScaledVector(pose.direction,.3))>-.05;
    const visibility=T.MathUtils.clamp(1-sim.lens*.85-sim.fluid*.25-(sim.gas<.16?.45:0)-(nearby?.4:0),0,1);
    const region=regionAt();if(region!==previousRegion){dwell=0;previousRegion=region;}
    if(moving&&!drive&&!steerX&&!steerY&&!rotating&&!drag&&visibility>.55)dwell+=dt;
    uniforms.simTime.value=sim.time;uniforms.gas.value=sim.gas;
    optics.uniforms.time.value=sim.time;optics.uniforms.lens.value=sim.lens;optics.uniforms.wash.value=T.MathUtils.lerp(optics.uniforms.wash.value,input.wash?1:0,.12);
    fluids.update(moving?dt:0,sim,input,inside);
    shaft.visible=retroflex;shaftClock+=dt;
    if(retroflex&&shaftClock>.2){shaftClock=0;const pts=Array.from({length:40},(_,i)=>{const v=curve.getPointAt(progress*i/39);return new T.Vector3(...deformPoint(v.x,v.y,v.z,sim.time,sim.gas));});const g=new T.TubeGeometry(new T.CatmullRomCurve3(pts),45,.045,8,false);shaft.geometry.dispose();shaft.geometry=g;}
    forceps.visible=['introduced','opened','sampled'].includes(toolStage);jaws.forEach((j,i)=>j.position.x=(i?1:-1)*(toolStage==='opened'?.021:.008));
    optics.updateExposure(dt);optics.composer.render();
    telemetry={progress,region,visibility,contact:contact||nearby,dwell,retroflex,yaw,pitch,roll,gas:sim.gas,fluid:sim.fluid,lens:sim.lens,drive,
      guide:contact?'Stop advancing. Re-centre the lumen and optimize distension.':nearby?'The tip is close to the mucosa. Withdraw slightly and reorient.':sim.gas>.85?'Distension is high in this model. Use only enough gas for a clear view.':visibility<.6?'The view is obscured. Use suction or lens wash as appropriate.':drive>0?'Advance gently under direct vision. Inspect as you go.':'Clear view. Inspect folds and document the region before moving on.'};
    hudClock+=dt;if(hudClock>.1){hudClock=0;onTelemetry({...telemetry});}
  }
  function setRetroflex(value){
    if(!enabled||orientationOnly)return {ok:false,message:'Resume the active examination before changing the viewing configuration.'};
    if(typeof value!=='boolean')return {ok:false,message:'Choose a valid viewing configuration.'};
    if(value && !['body','antrum'].includes(regionAt()))return {ok:false,message:'Retroflex only within the stomach after establishing adequate space.'};
    if(toolStage!=='idle')return {ok:false,message:'Withdraw accessories before changing the viewing configuration.'};
    retroflex=!!value;yaw=pitch=0;dwell=0;return {ok:true};
  }
  function dispose(){
    if(disposed)return;
    disposed=true;clearInput();observer.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clearInput);document.removeEventListener('visibilitychange',clearInput);
    canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointermove',pointermove);canvas.removeEventListener('pointerup',pointerup);canvas.removeEventListener('pointercancel',pointerup);canvas.removeEventListener('lostpointercapture',pointerup);canvas.removeEventListener('webglcontextlost',lost);
    const geometries=new Set(),materials=new Set([material]);scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    if(store)for(const item of store.cache.values()){item.main.dispose();item.map.dispose();}optics.dispose();renderer.dispose();canvas.remove();
  }
  return {canvas,loadCase,update,reset,dispose,setRetroflex,getTelemetry:()=>({...telemetry}),
    setOrientationOnly(value){orientationOnly=!!value;clearInput();dwell=0;},
    setDemonstrationPose(pose){if(!orientationOnly||disposed||contextLost)return;for(const axis of ['pitch','yaw','roll'])if(scopeAngle(axis,pose?.[axis])===null)return;pitch=scopeAngle('pitch',pose.pitch);yaw=scopeAngle('yaw',pose.yaw);roll=scopeAngle('roll',pose.roll);dwell=0;},
    setEnabled(value){enabled=!!value&&!disposed&&!contextLost;if(!enabled)clearInput();},
    setHeld(code,value){if(!scopeControlCodes.includes(code))return;if(value===true&&enabled)held.add(code);else held.delete(code);},
    setAngle(axis,value){if(!enabled)return;const angle=scopeAngle(axis,value);if(angle===null)return;if(axis==='yaw')yaw=angle;if(axis==='pitch')pitch=angle;if(axis==='roll')roll=angle;dwell=0;},
    centre(){if(!enabled)return;yaw=pitch=roll=0;dwell=0;},setTool(stage){if(!scopeToolStages.includes(stage))return;if(stage!==toolStage)clearInput();toolStage=stage;if(stage!=='idle'){keys.delete('KeyW');keys.delete('KeyS');held.delete('KeyW');held.delete('KeyS');}},
    setQuality(value){qualityValue=value;resize();},setReducedMotion(value){reducedMotion=!!value;},
    snapshot(){return {progress,yaw,pitch,roll,retroflex,...sim};},
    restore(value){if(!value)return;const state=normalizeScopeSnapshot(value);enabled=false;clearInput();toolStage='idle';retroflex=false;progress=state.progress;yaw=state.yaw;pitch=state.pitch;roll=state.roll;retroflex=state.retroflex&&['body','antrum'].includes(regionAt());Object.assign(sim,{gas:state.gas,fluid:state.fluid,lens:state.lens,time:state.time});dwell=0;hudClock=.11;update(0);},
    capture(){return renderer.domElement.toDataURL('image/jpeg',.8);},
  };
}
