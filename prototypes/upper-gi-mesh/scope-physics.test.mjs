import test from 'node:test';
import assert from 'node:assert/strict';
import {FlexibleScope,scopePath,SCOPE_RADIUS,createScopeMesh} from './scope-physics.mjs';
import {dynamicField,antralScale,deformPoint} from './tissue.mjs';
import * as T from 'three';
test('scope presets provide a connected finite centreline from the inlet',()=>{
 for(const id of ['entry','cardia','body','fundus','antrum','pylorus','bulb','descending']){
  const scope=new FlexibleScope(id);assert.ok(scope.points.length>=10);
  assert.ok(scope.tip.distanceTo(new T.Vector3(...deformPoint(...scopePath(id).at(-1).toArray(),0,.4)))<1e-8);
  for(const p of scope.points)assert.ok(dynamicField(p.x,p.y,p.z,0,.4)<-SCOPE_RADIUS,id+' initial clearance');
 }
});
test('advance feeds shaft length, withdrawal removes it, entry remains anchored',()=>{
 const scope=new FlexibleScope('entry'),initial=scope.length;
 for(let i=0;i<30;i++)scope.update(1/60,.4,i/60,.4);
 assert.ok(scope.length>initial+.1);
 for(let i=0;i<30;i++)scope.update(1/60,-.4,.5+i/60,.4);
 assert.ok(Math.abs(scope.length-initial)<.02);
 assert.ok(scope.points[0].distanceTo(scopePath('entry')[0])<1e-9);
});
test('shaft stays finite and outside the wall during constrained bending',()=>{
 const scope=new FlexibleScope('cardia');scope.pitch=1.2;
 for(let i=0;i<60;i++)scope.update(1/60,.2,i/60,.4);
 for(const p of scope.points){assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(dynamicField(p.x,p.y,p.z,1,.4)<-SCOPE_RADIUS+.02);}
 assert.ok(scope.maxStrain<.25,'strain '+scope.maxStrain);
});
test('fixed-step centreline update agrees at 30 and 60 Hz',()=>{
 const a=new FlexibleScope('entry'),b=new FlexibleScope('entry');
 for(let i=1;i<=30;i++)a.update(1/30,.2,i/30,.4);
 for(let i=1;i<=60;i++)b.update(1/60,.2,i/60,.4);
 assert.ok(a.tip.distanceTo(b.tip)<1e-5);
});
test('antral contraction travels distally and pylorus has a separate cycle',()=>{
 assert.ok(antralScale(1.6,11,0)<antralScale(1.6,0,0));
 assert.ok(antralScale(3.0,15,0)<antralScale(3.0,0,0));
 assert.ok(antralScale(3.45,4,0)<antralScale(3.45,8,0));
});
test('retroflexed rod settles without accumulating an uncontrolled turn',()=>{
 const s=new FlexibleScope('fundus');for(let i=0;i<300;i++)s.update(1/60,0,i/60,.4);
 const settled=s.tangent();for(let i=300;i<600;i++)s.update(1/60,0,i/60,.4);
 assert.ok(s.tangent().dot(settled)>.90);
 assert.ok(s.maxStrain<.10);assert.ok(s.tip.y>0,'backward-looking end remains in gastric body');
});
test('visible shaft triangles face outward and agree with their normals',()=>{
 const rod=new FlexibleScope('cardia'),view=createScopeMesh(new T.Scene(),new T.Scene());view.update(rod);
 const g=view.mesh.geometry,p=g.attributes.position,n=g.attributes.normal,ix=g.index;
 for(let i=0;i<g.drawRange.count;i+=3){
  const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2),av=new T.Vector3().fromBufferAttribute(p,a),bv=new T.Vector3().fromBufferAttribute(p,b),cv=new T.Vector3().fromBufferAttribute(p,c);
  assert.ok(bv.sub(av).cross(cv.sub(av)).dot(new T.Vector3().fromBufferAttribute(n,a))>0);
 }
});
test('held angulation uses a fixed command frame despite shaft movement',()=>{
 const s=new FlexibleScope('body');s.yaw=.9;s.pitch=.7;const commanded=s.desiredDirection();
 for(let i=0;i<300;i++)s.update(1/60,.3,i/60,.4);
 assert.ok(s.desiredDirection().dot(commanded)>1-1e-10,'shaft motion must not recirculate into steering');
});
test('camera rotation is bounded through pole crossings and large tip bends',()=>{
 const s=new FlexibleScope('body');let previous=s.cameraQuaternion();
 for(let i=0;i<240;i++){
  s.pitch=i<120?2.4:-2.4;s.update(1/60,0,i/60,.4);
  const q=s.cameraQuaternion();assert.ok(previous.angleTo(q)<=1.8/60+1e-5,'camera flipped');
  assert.ok(Math.abs(q.length()-1)<1e-8);previous=q;
 }
});
test('release after advancing with a strong bend does not produce endless spinning',()=>{
 const s=new FlexibleScope('body');s.yaw=1.4;s.pitch=.7;
 for(let i=0;i<360;i++)s.update(1/60,.3,i/60,.4);
 let travel=0,previous=s.cameraQuaternion();
 for(let i=360;i<960;i++){s.update(1/60,0,i/60,.4);const q=s.cameraQuaternion();travel+=previous.angleTo(q);previous=q;}
 assert.ok(travel<.15,'uncommanded angular travel '+travel);
});
