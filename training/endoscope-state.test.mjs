import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeScopeSnapshot,scopeAngle,scopeKeyAllowed,scopeAdvanceBlocked} from './endoscope-state.mjs';

test('complete snapshots preserve collapsed lumen, obscuration and motion phase',()=>{
 const saved={progress:.47,yaw:.4,pitch:-.6,roll:2,retroflex:true,gas:0,fluid:.7,lens:.6,time:321};
 assert.deepEqual(normalizeScopeSnapshot(saved),saved);
 assert.deepEqual(normalizeScopeSnapshot({gas:0}),{progress:0,yaw:0,pitch:0,roll:0,retroflex:false,gas:0,fluid:.08,lens:0,time:0});
});
test('restored state stays finite and bounded even for corrupt or legacy saves',()=>{
 for(const value of [null,[],undefined,{progress:Infinity,yaw:NaN,pitch:'1',roll:-Infinity,gas:'0',fluid:undefined,lens:NaN,time:Infinity,retroflex:'true'}]){
  const state=normalizeScopeSnapshot(value);
  assert.ok(Object.values(state).every(value=>typeof value==='boolean'||Number.isFinite(value)));
  assert.equal(state.retroflex,false);assert.equal(state.gas,.36);
 }
 assert.deepEqual(normalizeScopeSnapshot({progress:5,yaw:-99,pitch:99,roll:1000,gas:-1,fluid:2,lens:5,time:-4}),{progress:1,yaw:-1.5,pitch:1.5,roll:Math.PI,gas:0,fluid:1,lens:.65,time:0,retroflex:false});
 assert.equal(normalizeScopeSnapshot({time:Number.MAX_VALUE}).time,86400);
});
test('angulation ignores invalid values and bounds shaft rotation',()=>{
 for(const axis of ['yaw','pitch','roll'])for(const value of [NaN,Infinity,-Infinity,'0',null])assert.equal(scopeAngle(axis,value),null);
 assert.equal(scopeAngle('missing',1),null);
 assert.equal(scopeAngle('roll',999),Math.PI);assert.equal(scopeAngle('roll',-999),-Math.PI);
 assert.equal(scopeAngle('yaw',5),1.5);assert.equal(scopeAngle('pitch',-5),-1.5);assert.equal(scopeAngle('roll',0),0);
});
test('browser shortcuts never become insertion or fluid commands',()=>{
 assert.equal(scopeKeyAllowed({code:'KeyW'}),true);assert.equal(scopeKeyAllowed({code:'KeyI',shiftKey:true}),true);
 for(const modifier of ['ctrlKey','metaKey','altKey'])for(const code of ['KeyW','KeyS','KeyI'])assert.equal(scopeKeyAllowed({code,[modifier]:true}),false);
 assert.equal(scopeKeyAllowed({code:'Escape'}),false);
});
test('scope shortcuts work after action buttons without hijacking text editing or button activation',()=>{
 for(const code of ['KeyW','KeyI','KeyL','ArrowUp'])assert.equal(scopeKeyAllowed({code,target:{tagName:'BUTTON'}}),true);
 for(const tagName of ['INPUT','TEXTAREA','SELECT'])assert.equal(scopeKeyAllowed({code:'KeyW',target:{tagName}}),false);
 assert.equal(scopeKeyAllowed({code:'KeyI',target:{tagName:'DIV',isContentEditable:true}}),false);
 for(const code of ['Enter','Space'])assert.equal(scopeKeyAllowed({code,target:{tagName:'BUTTON'}}),false);
 for(const modifier of ['ctrlKey','metaKey','altKey'])assert.equal(scopeKeyAllowed({code:'KeyW',target:{tagName:'BUTTON'},[modifier]:true}),false);
});
test('advancement checks view and next-position clearance before changing progress',()=>{
 const clear={yaw:0,pitch:0,gas:.36,viewClearance:-.2,nextClearance:-.3};
 assert.equal(scopeAdvanceBlocked(clear),false);
 for(const blocked of [{yaw:1},{pitch:-1},{gas:.08},{viewClearance:-.01},{nextClearance:0},{nextClearance:NaN},{gas:Infinity}])assert.equal(scopeAdvanceBlocked({...clear,...blocked}),true);
});
