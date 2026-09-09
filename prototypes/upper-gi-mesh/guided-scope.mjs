import * as T from 'three';
import {deformPoint} from './tissue.mjs';

export const shaftRadius=.032;
// An inserted shaft follows the prescribed route, independently of gaze.
// Fixed buffers avoid rebuilding TubeGeometry on every animation frame.
export function createGuidedScope(track){
 const rings=320,sides=20,positions=new Float32Array((rings+1)*sides*3),normals=new Float32Array(positions.length),indices=[];
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
  const a=i*sides+j,b=i*sides+(j+1)%sides,c=a+sides,d=b+sides;
  indices.push(a,b,c,b,d,c);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:'#080c0a',roughness:.48,metalness:0,side:T.FrontSide}));mesh.frustumCulled=false;
 const cap=new T.Mesh(new T.SphereGeometry(shaftRadius,20,12),mesh.material);mesh.add(cap);
 let previous=-1,previousGas=-1;
 const point=u=>{const p=track.curve.getPointAt(u);return new T.Vector3(...deformPoint(p.x,p.y,p.z,0,previousGas));};
 return {mesh,update(gas){
  if(previous===track.progress&&previousGas===gas)return;
  previous=track.progress;previousGas=gas;
  // Stop behind the camera's optical face, not inside its near plane.
  const end=Math.max(0,track.progress-.10/track.length);mesh.visible=end>0;
  cap.position.copy(point(end));
  for(let i=0;i<=rings;i++){
   const u=end*i/rings,p=point(u),t=point(Math.min(1,u+.0001)).sub(point(Math.max(0,u-.0001))).normalize();
   const n=new T.Vector3(-t.y,t.x,0);
   for(let j=0;j<sides;j++){
    const angle=j/sides*Math.PI*2,x=n.x*Math.cos(angle),y=n.y*Math.cos(angle),z=Math.sin(angle),k=(i*sides+j)*3;
    positions[k]=p.x+x*shaftRadius;positions[k+1]=p.y+y*shaftRadius;positions[k+2]=p.z+z*shaftRadius;
    normals[k]=x;normals[k+1]=y;normals[k+2]=z;
   }
  }
  geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;
 }};
}
