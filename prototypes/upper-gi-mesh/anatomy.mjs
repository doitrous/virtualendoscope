import * as T from 'three';

// Dimensions are an illustrative shape model in centimetre-like scene units.
// Not a segmented patient organ, measured specimen or validated anatomical model.
const ellipsoids = [
  [[-2.0, 2.6, 0], [2.8, 2.8, 2.05]],
  [[-1.6, -.1, 0], [2.6, 3.8, 1.9]],
  [[1.25, -2.4, 0], [2.2, 1.3, 1.05]],
  [[3.45, -2.3, 0], [.65, .52, .55]],
];
const tubes = [
  [[.2, 7.2, 0], [.1, 3.3, 0], .64],
  [[3.8, -2.3, 0], [4.6, -2.1, 0], .56],
  [[4.6, -2.1, 0], [5.15, -3.1, 0], .64],
  [[5.15, -3.1, 0], [5.0, -4.8, 0], .61],
];
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * .25;
}
function ellipsoid(x, y, z, c, r) {
  const a = (x - c[0]) / r[0], b = (y - c[1]) / r[1], d = (z - c[2]) / r[2];
  const k0 = Math.hypot(a, b, d);
  const k1 = Math.hypot(a / r[0], b / r[1], d / r[2]);
  return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1;
}
function capsule(x, y, z, a, b, r) {
  const vx = b[0] - a[0], vy = b[1] - a[1], vz = b[2] - a[2];
  const t = T.MathUtils.clamp(((x-a[0])*vx + (y-a[1])*vy + (z-a[2])*vz)/(vx*vx+vy*vy+vz*vz), 0, 1);
  return Math.hypot(x-a[0]-t*vx, y-a[1]-t*vy, z-a[2]-t*vz) - r;
}
export function field(x, y, z) {
  let d = 99;
  for (const [c,r] of ellipsoids) d = smin(d, ellipsoid(x,y,z,c,r), .58);
  for (const [a,b,r] of tubes) d = smin(d, capsule(x,y,z,a,b,r), .3);
  return d;
}
export const landmarks = [
  { id:'entry', label:'Oesophagus', position:[.2,6.0,0], target:[.1,3,0] },
  { id:'cardia', label:'Cardia', position:[.05,3.25,0], target:[-1.8,.1,0] },
  { id:'fundus', label:'Fundus', position:[-2.4,3.2,0], target:[-.4,3.7,0] },
  { id:'body', label:'Body', position:[-1.7,.2,0], target:[.7,-2.3,0] },
  { id:'antrum', label:'Antrum', position:[1.1,-2.4,0], target:[3.6,-2.3,0] },
  { id:'pylorus', label:'Pylorus', position:[3.35,-2.3,0], target:[4.5,-2.1,0] },
  { id:'bulb', label:'Duodenal outlet', position:[4.5,-2.2,0], target:[5,-4,0] },
  { id:'descending', label:'Descending duodenum', position:[5,-4.15,0], target:[5,-4.8,0] },
];
export function gradient(x,y,z, sample=field) {
  const e = .008;
  return new T.Vector3(sample(x+e,y,z)-sample(x-e,y,z), sample(x,y+e,z)-sample(x,y-e,z), sample(x,y,z+e)-sample(x,y,z-e)).normalize();
}

export function buildGeometry(step = .22, sample=field) {
  const min = [-5.8,-5.8,-2.9], max = [6.2,8.2,2.9];
  const n = min.map((v,i)=>Math.ceil((max[i]-v)/step)+1);
  const values = new Float32Array(n[0]*n[1]*n[2]);
  const at = (x,y,z)=>(x*n[1]+y)*n[2]+z;
  for(let x=0;x<n[0];x++)for(let y=0;y<n[1];y++)for(let z=0;z<n[2];z++) values[at(x,y,z)] = sample(min[0]+x*step,min[1]+y*step,min[2]+z*step);
  const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
  const tets = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const positions=[], normals=[];
  function triangle(a,b,c) {
    const ab = new T.Vector3().subVectors(b,a), ac = new T.Vector3().subVectors(c,a);
    const centroid = new T.Vector3().add(a).add(b).add(c).multiplyScalar(1/3);
    if(ab.cross(ac).dot(gradient(centroid.x,centroid.y,centroid.z,sample)) < 0) [b,c]=[c,b];
    for(const v of [a,b,c]) { positions.push(v.x,v.y,v.z); const g=gradient(v.x,v.y,v.z,sample); normals.push(g.x,g.y,g.z); }
  }
  for(let x=0;x<n[0]-1;x++)for(let y=0;y<n[1]-1;y++)for(let z=0;z<n[2]-1;z++) {
    const ds=corners.map(([i,j,k])=>values[at(x+i,y+j,z+k)]);
    if(ds.every(v=>v<0)||ds.every(v=>v>=0))continue;
    const ps=corners.map(([i,j,k])=>new T.Vector3(min[0]+(x+i)*step,min[1]+(y+j)*step,min[2]+(z+k)*step));
    for(const tet of tets) {
      const ins=tet.filter(i=>ds[i]<0), outs=tet.filter(i=>ds[i]>=0);
      const edge=(a,b)=>ps[a].clone().lerp(ps[b],ds[a]/(ds[a]-ds[b]));
      if(ins.length===1) triangle(...outs.map(i=>edge(ins[0],i)));
      if(ins.length===3) triangle(...ins.map(i=>edge(outs[0],i)));
      if(ins.length===2) {
        const a=edge(ins[0],outs[0]), b=edge(ins[0],outs[1]), c=edge(ins[1],outs[0]), d=edge(ins[1],outs[1]);
        triangle(a,b,c);triangle(b,d,c);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.computeBoundingSphere();
  return geometry;
}

// Conservative tip collision: subdivide movement; never advance through a wall.
export function moveTip(position, direction, distance, clearance=.12) {
  const steps=Math.max(1,Math.ceil(Math.abs(distance)/.035));
  const increment=direction.clone().multiplyScalar(distance/steps);
  let contact=false;
  for(let i=0;i<steps;i++) {
    const next=position.clone().add(increment);
    if(field(next.x,next.y,next.z)>-clearance){contact=true;break;}
    position.copy(next);
  }
  return contact;
}
