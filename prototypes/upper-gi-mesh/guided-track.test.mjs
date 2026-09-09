import test from 'node:test';
import assert from 'node:assert/strict';
import {GuidedTrack,stops} from './guided-track.mjs';
import {dynamicField,collapseScale} from './tissue.mjs';
import {createGuidedScope,shaftRadius} from './guided-scope.mjs';
test('starts stopped and looking does not move along the track',()=>{
 const tr=new GuidedTrack();tr.yaw=2;tr.pitch=.8;const p=tr.pose().position;
 for(let i=0;i<300;i++)tr.advance(1/30);
 assert.equal(tr.progress,0);assert.ok(tr.pose().position.distanceTo(p)<1e-10);
 assert.ok(tr.pose(14).position.distanceTo(tr.pose(0).position)<1e-10,'tissue motion must not move a stopped camera');
});
test('travel has bounded speed and never catches up after a long frame',()=>{
 const tr=new GuidedTrack();tr.playing=true;tr.advance(10);
 assert.ok(tr.progress*tr.length<=tr.speed/30+1e-10);
 const before=tr.progress;tr.playing=false;tr.advance(1);assert.equal(tr.progress,before);
});
test('manual reverse and endpoint stop are bounded',()=>{
 const tr=new GuidedTrack();tr.progress=.5;tr.advance(1/30,-1);assert.ok(tr.progress<.5);
 tr.progress=.999999;tr.playing=true;tr.advance(1/30);assert.equal(tr.progress,1);assert.equal(tr.playing,false);
 tr.progress=0;tr.advance(1/30,-1);assert.equal(tr.progress,0);
});
test('all region stops belong to the same route and seeking stops travel',()=>{
 const tr=new GuidedTrack();for(const stop of stops){tr.playing=true;tr.seek(stop.id);assert.equal(tr.playing,false);assert.ok(tr.curve.getPointAt(tr.progress).distanceTo({x:stop.p[0],y:stop.p[1],z:stop.p[2]})<.015);}
});
test('route clears tissue during contraction and gas changes',()=>{
 const tr=new GuidedTrack();for(let i=0;i<=500;i++){tr.progress=i/500;
  for(const time of [0,4,10,14,18,22])for(const gas of [0,.4,1]){const p=tr.pose(time,gas).position;assert.ok(dynamicField(p.x,p.y,p.z,time,gas)<-shaftRadius);}
 }
});
test('collapse opens progressively with insufflation',()=>{
 assert.equal(collapseScale(0),.3);assert.equal(collapseScale(1),1);
 assert.ok(collapseScale(.2)<collapseScale(.5));
});
test('inserted shaft remains within tissue and is independent of gaze',()=>{
 const tr=new GuidedTrack(),scope=createGuidedScope(tr);tr.progress=1;
 for(const gas of [0,.4,1]){
  scope.update(gas);const positions=scope.mesh.geometry.attributes.position.array;
  for(const time of [0,4,10,14,18,22])for(let i=0;i<positions.length;i+=3){
   assert.ok(dynamicField(positions[i],positions[i+1],positions[i+2],time,gas)<0,'shaft must remain inside');
  }
  const before=positions.slice();tr.yaw=3;tr.pitch=1;scope.update(gas);assert.deepEqual(positions,before);
 }
 tr.progress=0;scope.update(0);assert.equal(scope.mesh.visible,false);
});
