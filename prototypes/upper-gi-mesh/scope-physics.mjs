import * as T from 'three';
import {dynamicField,deformPoint} from './tissue.mjs';

export const SCOPE_RADIUS=.095;
const anchor=new T.Vector3(.2,7.08,0);
const zero=new T.Vector3(),up=new T.Vector3(0,0,1);
export function scopePath(id){
 const start=[[.2,7.08,0],[.17,6.3,0],[.12,5,0],[.05,3.25,0]];
 const body=[[-.8,1.8,0],[-1.7,.2,0]];
 const paths={entry:start.slice(0,2),cardia:start,
  body:[...start,...body],
  fundus:[...start,[-.7,1.6,0],[-1.4,0,0],[-2.5,-.3,0],[-3.15,.25,0],[-2.9,1,0],[-2.3,1.6,0]],
  antrum:[...start,...body,[-.65,-1.6,0],[1.1,-2.4,0]],
  pylorus:[...start,...body,[-.65,-1.6,0],[1.1,-2.4,0],[3.25,-2.3,0]],
  bulb:[...start,...body,[-.65,-1.6,0],[1.1,-2.4,0],[3.25,-2.3,0],[4.5,-2.2,0]],
  descending:[...start,...body,[-.65,-1.6,0],[1.1,-2.4,0],[3.25,-2.3,0],[4.5,-2.2,0],[5.05,-3.2,0],[5,-4.15,0]],
 };
 return (paths[id]||paths.cardia).map(p=>new T.Vector3(...p));
}

function resample(points,n){
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+points[i].distanceTo(points[i-1]));
 const total=lengths.at(-1);let j=1;
 return Array.from({length:n},(_,i)=>{const s=i*total/(n-1);while(j<points.length-1&&lengths[j]<s)j++;
  return points[j-1].clone().lerp(points[j],(s-lengths[j-1])/Math.max(1e-8,lengths[j]-lengths[j-1]));});
}

// Position-based elastic rod approximation. No material constants or force units
// are inferred from the videos. Fixed-step constraints, finite shaft radius,
// segment wall tests, self separation and damping are genuine simulated state.
export class FlexibleScope{
 constructor(id='entry'){this.reset(id);}
 reset(id,time=0,gas=.4){
  const path=scopePath(id).map(p=>new T.Vector3(...deformPoint(p.x,p.y,p.z,time,gas)));path[0].copy(anchor);
  this.length=path.slice(1).reduce((s,p,i)=>s+p.distanceTo(path[i]),0);
  this.points=resample(path,Math.max(10,Math.ceil(this.length/.14)+1));
  this.previous=this.points.map(p=>p.clone());this.accumulator=0;this.contacts=0;this.blocked=false;this.maxStrain=0;
  const frame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(zero,this.proximalTangent(),up));
  this.steeringFrame=frame.clone();
  this.viewFrame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(zero,this.tangent(),up));
  this.viewDirection=this.tangent();
  const local=this.tangent().applyQuaternion(frame.clone().invert());
  this.yaw=Math.atan2(-local.x,-local.z);this.pitch=Math.asin(T.MathUtils.clamp(local.y,-1,1));this.roll=0;this.retroflex=id==='fundus';
 }
 get tip(){return this.points.at(-1);}
 tangent(){return this.tip.clone().sub(this.points.at(-2)).normalize();}
 bendStart(){return Math.max(2,this.points.length-1-Math.ceil(Math.min(2.2,this.length*.65)/(this.length/(this.points.length-1))));}
 proximalTangent(){const i=this.bendStart();return this.points[i-1].clone().sub(this.points[i-2]).normalize();}
 desiredDirection(){
  // Fixed command frame: never feed the rod's changing proximal tangent back
  // into held angulation. That feedback caused persistent, uncommanded turning.
  const q=this.steeringFrame.clone();
  q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),this.roll));
  q.multiply(new T.Quaternion().setFromEuler(new T.Euler(this.pitch,this.yaw,0,'YXZ')));
  return new T.Vector3(0,0,-1).applyQuaternion(q).normalize();
 }
 cameraQuaternion(){
  const q=this.viewFrame.clone();
  return q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),this.roll));
 }
 update(dt,drive,time,gas){
  this.accumulator+=Math.min(dt,.1);let steps=0;
  while(this.accumulator>=1/60&&steps<6){this.solve(1/60,drive,time-this.accumulator+1/60,gas);this.accumulator-=1/60;steps++;}
 }
 project(p,time,gas,margin=SCOPE_RADIUS+.015){
  const f=(x,y,z)=>dynamicField(x,y,z,time,gas);let touched=false;
  for(let n=0;n<3;n++){
   const d=f(p.x,p.y,p.z)+margin;if(d<=0)break;
   const e=.006,g=new T.Vector3(f(p.x+e,p.y,p.z)-f(p.x-e,p.y,p.z),f(p.x,p.y+e,p.z)-f(p.x,p.y-e,p.z),f(p.x,p.y,p.z+e)-f(p.x,p.y,p.z-e)).normalize();
   if(g.lengthSq()<.5)break;p.addScaledVector(g,-Math.min(.12,d+.002));touched=true;
  }
  return touched;
 }
 solve(dt,drive,time,gas){
  const oldTip=this.tip.clone(),desired=this.desiredDirection();
  this.length=T.MathUtils.clamp(this.length+drive*dt,.7,23);
  const count=Math.max(10,Math.ceil(this.length/.14)+1);
  if(count!==this.points.length){this.points=resample(this.points,count);this.previous=this.points.map(p=>p.clone());}
  const ps=this.points,n=ps.length,rest=this.length/(n-1);
  const target=oldTip.clone().addScaledVector(drive>=0?desired:this.tangent(),drive*dt);
  const bendStart=this.bendStart(),proximal=this.proximalTangent();
  const totalRotation=new T.Quaternion().setFromUnitVectors(proximal,desired);
  const bendDirections=Array.from({length:n-bendStart},(_,j)=>proximal.clone().applyQuaternion(new T.Quaternion().slerp(totalRotation,(j+1)/(n-bendStart))));
  for(let i=2;i<n;i++){
   const p=ps[i],old=p.clone(),velocity=p.clone().sub(this.previous[i]).multiplyScalar(.70);
   velocity.clampLength(0,.012);p.add(velocity);p.y-=.000015;this.previous[i].copy(old);
  }
  const constrain=(a,b,length,stiffness=1)=>{
   const delta=ps[b].clone().sub(ps[a]),d=delta.length();if(d<1e-9)return;
   const wa=a<2?0:1,wb=b<2?0:1;if(!(wa+wb))return;
   delta.multiplyScalar((d-length)/d*stiffness/(wa+wb));
   ps[a].addScaledVector(delta,wa);ps[b].addScaledVector(delta,-wb);
  };
  this.contacts=0;
  for(let it=0;it<14;it++){
   ps[0].copy(anchor);ps[1].copy(anchor).add(new T.Vector3(0,-rest,0));
   // Driving pushes the distal node while inserted arc length feeds at the entry.
   if(drive)ps[n-1].lerp(target,.45);
   for(let i=2;i<bendStart;i++)constrain(i-2,i,rest*2,.12);
   for(let i=bendStart;i<n;i++){
    const want=ps[i-1].clone().addScaledVector(bendDirections[i-bendStart],rest);
    const correction=want.sub(ps[i]).multiplyScalar(.30);
    ps[i].add(correction);if(i-1>=2)ps[i-1].addScaledVector(correction,-.20);
   }
   for(let i=1;i<n;i++)constrain(i-1,i,rest);
   for(let i=n-1;i>1;i--)constrain(i-1,i,rest);
   for(let i=2;i<n;i++)if(this.project(ps[i],time,gas)){if(it===13)this.contacts++;this.previous[i].lerp(ps[i],.65);}
   // Segment midpoint contact prevents a straight chord crossing a narrow fold.
   for(let i=2;i<n;i++){
    const midpoint=ps[i].clone().add(ps[i-1]).multiplyScalar(.5),before=midpoint.clone();
    if(this.project(midpoint,time,gas)){const correction=midpoint.sub(before);ps[i].add(correction);if(i>2)ps[i-1].add(correction);}
   }
   if(it%3===0)for(let i=2;i<n;i++)for(let j=i+4;j<n;j++){
    const dx=ps[j].x-ps[i].x,dy=ps[j].y-ps[i].y,dz=ps[j].z-ps[i].z,minimum=SCOPE_RADIUS*2+.012,d2=dx*dx+dy*dy+dz*dz;
    if(d2>1e-12&&d2<minimum*minimum){const d=Math.sqrt(d2),delta=new T.Vector3(dx,dy,dz).multiplyScalar((minimum-d)/d*.5);ps[i].sub(delta);ps[j].add(delta);}
   }
  }
  // Contact takes precedence over exact inextensibility at an unresolved pinch.
  for(let i=2;i<n;i++)this.project(ps[i],time,gas);
  this.maxStrain=0;for(let i=1;i<n;i++)this.maxStrain=Math.max(this.maxStrain,Math.abs(ps[i].distanceTo(ps[i-1])/rest-1));
  this.blocked=!!drive&&(this.tip.distanceTo(oldTip)<Math.abs(drive)*dt*.15||this.maxStrain>.12);
  // Do not accumulate unlimited insertion into a jammed configuration.
  if(drive>0&&this.maxStrain>.12)this.length-=drive*dt;
  // Parallel-transport the viewing frame instead of rebuilding a lookAt frame
  // against world-up (which flips abruptly when the tangent crosses that pole).
  const nextDirection=this.tangent();
  const delta=new T.Quaternion().setFromUnitVectors(this.viewDirection,nextDirection);
  const targetFrame=delta.multiply(this.viewFrame.clone());
  this.viewFrame.rotateTowards(targetFrame,dt*1.8);
  this.viewDirection.set(0,0,-1).applyQuaternion(this.viewFrame);
 }
}

export function createScopeMesh(scene,mapScene){
 const radial=14,maxPoints=180;
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(maxPoints*(radial+1)*3),3));
 geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(maxPoints*(radial+1)*3),3));
 geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(maxPoints*(radial+1)*3),3));
 const indices=[];for(let i=0;i<maxPoints-1;i++)for(let j=0;j<radial;j++){
  const a=i*(radial+1)+j,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);
 }geometry.setIndex(indices);geometry.setDrawRange(0,0);
 const mesh=new T.Mesh(geometry,new T.MeshPhysicalMaterial({color:'#363e3e',vertexColors:true,roughness:.31,clearcoat:.8,clearcoatRoughness:.21}));mesh.frustumCulled=false;scene.add(mesh);
 const mapMesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color:'#91d5c5',depthTest:false,transparent:true,opacity:.85}));mapMesh.frustumCulled=false;mapMesh.renderOrder=8;mapScene.add(mapMesh);
 return {mesh,mapMesh,update(scope){
  const ps=scope.points,n=Math.min(maxPoints,ps.length);let normal=new T.Vector3(1,0,0);
  for(let i=0;i<n;i++){
   const tangent=ps[Math.min(i+1,n-1)].clone().sub(ps[Math.max(i-1,0)]).normalize();
   normal.addScaledVector(tangent,-normal.dot(tangent)).normalize();if(normal.lengthSq()<.5)normal.set(0,0,1);
   const binormal=new T.Vector3().crossVectors(tangent,normal).normalize();
   const distal=i>=scope.bendStart(),radius=SCOPE_RADIUS*(distal&&i%2===0?.94:1);
   const silver=i===scope.bendStart()||i===n-2;const shade=silver?.68:1;
   for(let j=0;j<=radial;j++){
    const a=j/radial*Math.PI*2,dir=normal.clone().multiplyScalar(Math.cos(a)).addScaledVector(binormal,Math.sin(a)),v=ps[i].clone().addScaledVector(dir,radius),k=i*(radial+1)+j;
    geometry.attributes.position.setXYZ(k,v.x,v.y,v.z);geometry.attributes.normal.setXYZ(k,dir.x,dir.y,dir.z);
    geometry.attributes.color.setXYZ(k,silver?shade*2.5:shade,silver?shade*2.5:shade,silver?shade*2.5:shade);
   }
  }
  for(const attribute of Object.values(geometry.attributes))attribute.needsUpdate=true;
  geometry.setDrawRange(0,(n-1)*radial*6);
 }};
}
