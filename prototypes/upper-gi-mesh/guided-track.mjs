import * as T from 'three';
import {deformPoint} from './tissue.mjs';
export const stops=[
 {id:'entry',label:'Oesophagus',p:[.17,6.3,0]},
 {id:'cardia',label:'Cardia',p:[.05,3.25,0]},
 {id:'fundus',label:'Fundus',p:[-2.4,3.2,0]},
 {id:'body',label:'Body',p:[-1.7,.2,0]},
 {id:'antrum',label:'Antrum',p:[1.1,-2.4,0]},
 {id:'pylorus',label:'Pylorus',p:[3.35,-2.3,0]},
 {id:'bulb',label:'Duodenal bulb',p:[4.5,-2.2,0]},
 {id:'descending',label:'Descending duodenum',p:[5,-4.15,0]},
];
export class GuidedTrack{
 constructor(){
  this.curve=new T.CatmullRomCurve3(stops.map(s=>new T.Vector3(...s.p)),false,'centripetal');
  this.curve.arcLengthDivisions=2400;this.length=this.curve.getLength();
  this.progress=0;this.playing=false;this.speed=.45;this.yaw=0;this.pitch=0;
  this.stopProgress=stops.map(s=>{let best=0,d=Infinity;for(let i=0;i<=2400;i++){const n=this.curve.getPointAt(i/2400).distanceToSquared(new T.Vector3(...s.p));if(n<d){d=n;best=i/2400;}}return best;});
 }
 advance(dt,manual=0){
  // Discard long stalls. There is no accumulator or catch-up motion.
  const safeDt=Math.min(Math.max(dt,0),1/30);
  const drive=manual||(+this.playing);
  this.progress=T.MathUtils.clamp(this.progress+drive*this.speed*safeDt/this.length,0,1);
  if(this.progress===1)this.playing=false;
 }
 seek(id){this.progress=this.stopProgress[stops.findIndex(s=>s.id===id)]??0;this.playing=false;this.yaw=this.pitch=0;}
 pose(time=0,gas=.4){
  const p=this.curve.getPointAt(this.progress);
  // Motility deforms tissue around the route, never the student's viewpoint.
  const position=new T.Vector3(...deformPoint(p.x,p.y,p.z,0,gas));
  // Track tangent, never a physics result. Fixed Z-up is safe here: the path
  // stays in the XY plane and looking offsets do not feed back into it.
  const tangent=this.curve.getTangentAt(this.progress);
  const frame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(new T.Vector3(),tangent,new T.Vector3(0,0,1)));
  frame.multiply(new T.Quaternion().setFromEuler(new T.Euler(this.pitch,this.yaw,0,'YXZ')));
  return {position,quaternion:frame};
 }
}
