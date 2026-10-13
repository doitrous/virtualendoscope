import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {DEMO_CHECKPOINT,demoCanStart,demoReturnState,caseCheckpoint,demoBlocksAction} from './demo-lifecycle.mjs';
import {savedCheckpoint} from './app-lifecycle.mjs';
import {createSession,transition} from './session.mjs';
import {cases,landmarks} from './content/cases.mjs';
import {preparationSteps,recoverySteps} from './content/curriculum.mjs';
import {demoPose} from './control-demo.mjs';

const config={cases,landmarks,preparationSteps,recoverySteps};
const pose={progress:.71,pitch:.2,yaw:-.3,roll:.4,retroflex:false,gas:.45,fluid:.1,lens:.2,time:31};
const returnState=checkpoint=>demoReturnState({session:{id:'case-1'},checkpoint,room:'procedure',view:'scope',showIntro:false});

test('watching, manual practice, and returning always save the original case position',()=>{
 const original=returnState(pose);
 for(const extra of [{state:{practicing:false}},{state:{practicing:true}},{returning:true}]){
  for(const scopeReady of [true,false]){
   const checkpoint=caseCheckpoint({demo:{returnState:original,...extra},scopeReady,scopeSnapshot:DEMO_CHECKPOINT,pendingScopeCheckpoint:DEMO_CHECKPOINT,pendingScopeSessionId:'case-1',sessionId:'case-1'});
   assert.deepEqual(checkpoint,pose);
   assert.notEqual(checkpoint,original.checkpoint);
  }
 }
});

test('a demo checkpoint cannot be assigned to a replacement case or a session that had no scope position',()=>{
 const demo={returnState:returnState(pose)};
 assert.equal(caseCheckpoint({demo,scopeReady:true,scopeSnapshot:DEMO_CHECKPOINT,sessionId:'case-2'}),null);
 assert.equal(caseCheckpoint({demo:{returnState:returnState(null)},scopeReady:true,scopeSnapshot:DEMO_CHECKPOINT,sessionId:'case-1'}),null);
 assert.equal(demoReturnState({session:null,room:'theory',view:'world',showIntro:true}).sessionId,null);
});

test('outside a demo, an unavailable scope preserves only the pending checkpoint for that case',()=>{
 assert.deepEqual(caseCheckpoint({scopeReady:true,scopeSnapshot:pose,sessionId:'case-1'}),pose);
 assert.deepEqual(caseCheckpoint({scopeReady:false,scopeSnapshot:DEMO_CHECKPOINT,pendingScopeCheckpoint:pose,pendingScopeSessionId:'case-1',sessionId:'case-1'}),pose);
 assert.equal(caseCheckpoint({scopeReady:false,scopeSnapshot:DEMO_CHECKPOINT,pendingScopeCheckpoint:pose,pendingScopeSessionId:'case-2',sessionId:'case-1'}),null);
});

test('return state and saved case snapshot remain independent of live mutations',()=>{
 const checkpoint={...pose},session=createSession(cases[0].id,'manual',100);
 const restore=demoReturnState({session,checkpoint,room:'recovery',view:'world',showIntro:true,startAfter:true});
 const demo={returnState:restore};
 const saved=savedCheckpoint(session,caseCheckpoint({demo,sessionId:session.id}),200);
 checkpoint.progress=0;session.observations.push('body');session.report='Changed live record';
 assert.deepEqual(restore.checkpoint,pose);
 assert.deepEqual(saved.scope,pose);
 assert.deepEqual(saved.session.observations,[]);
 assert.equal(saved.session.report,'');
 saved.scope.pitch=1;restore.checkpoint.roll=1;
 assert.equal(restore.checkpoint.pitch,pose.pitch);
 assert.equal(saved.scope.roll,pose.roll);
 assert.deepEqual({room:restore.room,view:restore.view,showIntro:restore.showIntro,startAfter:restore.startAfter},{room:'recovery',view:'world',showIntro:true,startAfter:true});
});

test('unsafe and legacy return checkpoints are normalized without modifying their source',()=>{
 const checkpoint={progress:Infinity,pitch:99,yaw:-99,roll:NaN,gas:-2,fluid:4,lens:Infinity,retroflex:'true'};
 const before=structuredClone(checkpoint);
 const restore=returnState(checkpoint);
 assert.deepEqual(checkpoint,before);
 assert.deepEqual(restore.checkpoint,{progress:0,yaw:-1.5,pitch:1.5,roll:0,gas:0,fluid:1,lens:0,time:0,retroflex:false});
 assert.ok(Object.isFrozen(DEMO_CHECKPOINT));
 assert.ok(DEMO_CHECKPOINT.progress>.4&&DEMO_CHECKPOINT.progress<.58);
});

test('entry is available in both paused and active cases and every learner mode',()=>{
 assert.equal(demoCanStart(null),true);
 for(const phase of ['briefing','preparation','procedure','recovery','debrief']){
  for(const paused of [false,true])for(const mode of ['guided','manual']){
   const session={phase,paused,mode,biopsy:{stage:'idle'},emergency:null};
   assert.equal(demoCanStart(session),true,`${phase}, ${mode}, paused=${paused}`);
   assert.equal(demoCanStart(session,{loading:true}),false);
   assert.equal(demoCanStart(session,{photosLoading:true}),false);
  }
 }
});

test('an active safety drill or any unfinished accessory workflow blocks demo entry',()=>{
 assert.equal(demoCanStart({emergency:{type:'hypoxia'},biopsy:{stage:'idle'}}),false);
 for(const stage of ['introduced','opened','sampled','retracted'])assert.equal(demoCanStart({emergency:null,biopsy:{stage,sampleCount:stage==='introduced'?0:1}}),false,stage);
});

test('the demo guard prevents examination evidence, time credit, and workflow changes',()=>{
 let session=createSession(cases[0].id,'manual',100);
 session.phase='procedure';session.position='left-lateral';session.preparation=preparationSteps.map(step=>step.id);
 const before=structuredClone(session);
 const actions=[
  {type:'OBSERVE'},{type:'PHOTO'},{type:'FINDING',id:cases[0].findings[0]?.id},
  {type:'BIOPSY',step:'introduce'},{type:'TICK',dt:1,active:true},
  {type:'BRIEF'},{type:'PREPARE',id:preparationSteps[0].id},{type:'START'},
  {type:'DRILL'},{type:'RESPOND',id:'stop'},{type:'RESOLVE'},
  {type:'REPORT',text:'Demo must not overwrite the case record'},{type:'END'},{type:'FINISH'},
  {type:'PAUSE',value:false},{type:'PAUSE',value:1},
 ];
 for(const action of actions){
  assert.equal(demoBlocksAction(action),true,action.type);
  if(!demoBlocksAction(action))session=transition(session,action,config).session;
 }
 assert.deepEqual(session,before);
 const pause={type:'PAUSE',value:true};
 assert.equal(demoBlocksAction(pause),false);
 const paused=transition(session,pause,config);
 assert.equal(paused.ok,true);
 assert.deepEqual(paused.session,{...before,paused:true});
});

// Execute the production transition functions with deferred I/O. The app's
// top-level browser boot prevents importing it directly in a Node test.
test('graphics loss during a pending production mesh load leaves Retry available and preserves the case checkpoint',async()=>{
 const [app,endoscope]=await Promise.all([fs.readFile(new URL('./app.mjs',import.meta.url),'utf8'),fs.readFile(new URL('./endoscope.mjs',import.meta.url),'utf8')]);
 const loader=endoscope.slice(endoscope.indexOf('  async function loadCase('),endoscope.indexOf('  function reset()'));
 const prepare=app.slice(app.indexOf('async function prepareScope('),app.indexOf('function enterScope()'));
 const harness=new Function('checkpoint',`
  let scopeLoadGeneration=0,pendingScopeCheckpoint=null,pendingScopeSessionId=null,scopeInit=null;
  let loadingScope=false,scopeReady=false,contextLost=false,enabled=false,resolveMeshes;
  let loadToken=0,disposed=false,telemetry={},meshActivations=0,pathology,organ={geometry:{dispose(){}}};
  const session={id:'case-1',phase:'procedure',paused:false},preferences={quality:'balanced',reducedMotion:false};
  const indicator={hidden:true,textContent:'',innerHTML:''};
  const $=()=>indicator,esc=String,persist=()=>{},render=()=>{},toast=()=>{},world=null,clearInput=()=>{};
  const uniforms={pathologyKind:{value:0},ulcerCentre:{value:{set(){}}}};
  const createTrainingPathology=()=>({centre:[0,0,0]}),refineGastricSurface=()=>({}),reset=()=>{};
  const store={get:()=>new Promise(resolve=>resolveMeshes=resolve),activate:()=>meshActivations++};
  ${loader}
  const scope={loadCase,restore:()=>{},setReducedMotion:()=>{},setEnabled:value=>enabled=value&&!contextLost};
  const syncControls=()=>scope.setEnabled(scopeReady&&!session.paused);
  ${prepare}
  return {load:()=>prepareScope({meshCaseIds:['normal']},{checkpoint}),interrupt(){contextLost=true;showScopeError('Graphics context lost');},resolve(){resolveMeshes({});},state(){return {scopeReady,loadingScope,retryVisible:!indicator.hidden,enabled,pendingScopeCheckpoint,pendingScopeSessionId,meshActivations};}};
 `)(pose);
 const pending=harness.load();harness.interrupt();harness.resolve();
 assert.equal(await pending,false);
 assert.deepEqual(harness.state(),{scopeReady:false,loadingScope:false,retryVisible:true,enabled:false,pendingScopeCheckpoint:pose,pendingScopeSessionId:'case-1',meshActivations:0});
});

test('production retry preserves a paused demo pose and initializes a reduced-motion step without a prior pose',async()=>{
 const source=await fs.readFile(new URL('./app.mjs',import.meta.url),'utf8');
 const retry=source.slice(source.indexOf("  if(action==='retry-scope')"),source.indexOf("  if(action==='pause')"));
 const createHarness=new Function('demoPose','DEMO_CHECKPOINT','demo','reducedMotion',`
  let controlDemo=demo,loadingScope=false,pendingScopeSessionId=null,pendingScopeCheckpoint=null,scopeInit={};
  let appliedPose=null,orientationOnly=false,loadedCase=null,loadedCheckpoint=null,disposed=false;
  const session={id:'case-1'},preferences={reducedMotion};
  let scope={snapshot:()=>({progress:.43}),dispose:()=>disposed=true};
  const currentCase=()=>({meshCaseIds:['gastric-ulcer']});
  const syncControls=()=>{};
  const prepareScope=async(c,{checkpoint})=>{loadedCase=c;loadedCheckpoint=checkpoint;scope={setOrientationOnly:value=>orientationOnly=value,setDemonstrationPose:pose=>appliedPose=pose};return true;};
  return {async retry(){const action='retry-scope';${retry}},state:()=>({appliedPose,orientationOnly,loadedCase,loadedCheckpoint,disposed})};
 `);
 for(const state of [
  {demo:{state:{stepId:'pitch',paused:true},lastPose:{pitch:.31,yaw:0,roll:0},elapsed:1.2},reducedMotion:false,expected:{pitch:.31,yaw:0,roll:0}},
  {demo:{state:{stepId:'yaw',paused:true},elapsed:0},reducedMotion:true,expected:demoPose('yaw',1.3)},
 ]){
  const harness=createHarness(demoPose,DEMO_CHECKPOINT,state.demo,state.reducedMotion);
  await harness.retry();
  assert.deepEqual(harness.state(),{appliedPose:state.expected,orientationOnly:true,loadedCase:{meshCaseIds:['normal']},loadedCheckpoint:DEMO_CHECKPOINT,disposed:true});
 }
});
