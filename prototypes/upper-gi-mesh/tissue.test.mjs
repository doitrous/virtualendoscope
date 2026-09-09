import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {tissueField,deformation,deformPoint,antralScale,dynamicField,moveDynamic,updateFluids,collapseScale} from './tissue.mjs';
import {landmarks} from './anatomy.mjs';
test('all inspection positions remain inside the folded cavity throughout a cycle',()=>{
 for(let t=0;t<22;t+=.5)for(const p of landmarks)assert.ok(dynamicField(...p.position,t,.3)<-.1*collapseScale(.3),p.id+' '+t);
});
test('oesophageal contraction closes and reopens; gas distends tissue',()=>{
 assert.ok(deformation(6,14,0).scale<deformation(6,3,0).scale-.35);
 assert.ok(deformation(6,21.3,0).scale>deformation(6,14,0).scale+.35);
 assert.ok(deformation(6,14,1).scale>deformation(6,14,0).scale);
});
test('deformation inverse used by collision matches the render transformation',()=>{
 for(const [x,y,z] of [[.6,6,.2],[-3,1,1],[3,-2.3,.5]]){
  const d=deformation(y,14,.5),q=deformPoint(x,y,z,14,.5);
  assert.ok(Math.abs(dynamicField(...q,14,.5)-tissueField(x,y,z)*Math.min(d.scale,antralScale(q[0],14,.5))*collapseScale(.5))<1e-8);
 }
});
test('large navigation steps cannot tunnel through moving tissue',()=>{
 const p=new T.Vector3(.2,6,0);assert.equal(moveDynamic(p,new T.Vector3(1,0,0),10,14,.3),true);
 assert.ok(dynamicField(...p.toArray(),14,.3)<=-.1);
});
test('fluid controls bounded, suction clears fluid, wash clears lens',()=>{
 const a={gas:.4,fluid:0,lens:0};updateFluids(a,100,{air:1,water:1,suction:0,wash:0});
 assert.deepEqual(a,{gas:1,fluid:1,lens:.65});updateFluids(a,100,{air:0,water:0,suction:1,wash:1});assert.deepEqual(a,{gas:0,fluid:0,lens:0});
});
test('fluid evolution is frame-rate independent away from bounds',()=>{
 const a={gas:.2,fluid:.2,lens:.2},b={...a},i={air:1,water:1,suction:0,wash:0};
 updateFluids(a,1,i);for(let n=0;n<60;n++)updateFluids(b,1/60,i);
 for(const key of Object.keys(a))assert.ok(Math.abs(a[key]-b[key])<1e-10);
});
