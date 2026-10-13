import * as T from 'three';
import {field, gradient} from '../prototypes/upper-gi-mesh/anatomy.mjs';
import {tissueField} from '../prototypes/upper-gi-mesh/tissue.mjs';

const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const smooth = (low, high, v) => { const t = clamp((v - low) / (high - low)); return t*t*(3 - 2*t); };
export const MAX_BODY_RELAXATION = .11;
export const MAX_GASTRIC_RELAXATION = .19;

// Visual inference from the body/antrum photographs cited in
// docs/VISUAL-REALISM-REVIEW.md: broad curved rugae vary in spacing, width and
// termination and become less prominent towards the antrum. These authored
// parameters are not measurements or a patient reconstruction.
// [angle, width, height, lower end, upper end, obliquity, curve phase]
const ribbons = [
  [-2.92, .36, .13, -2.85, 2.80, .055, .3],
  [-2.05, .48, .10, -2.35, 3.10, -.045, 1.8],
  [-1.30, .32, .15, -2.70, 2.30, .09, 3.5],
  [-.38, .43, .11, -1.90, 2.95, -.06, 2.2],
  [.73, .39, .14, -2.65, 2.40, .065, 4.1],
  [1.58, .51, .095, -2.10, 3.05, -.035, 5.2],
  [2.38, .33, .12, -2.80, 2.15, .08, 1.1],
];

function bodyRefinementWeight(x, y, z) {
  if (![x,y,z].every(Number.isFinite)) return 0;
  const body = smooth(-3.45, -2.35, y)*(1 - smooth(2.45, 3.75, y))*(1 - smooth(-.75, 1.25, x));
  const cardia = smooth(.55, 1.55, Math.hypot(x - .05, y - 3.25, z));
  const axis = smooth(.45, 1.05, Math.hypot(x + 1.65, z));
  return body*cardia*axis;
}

export function gastricCapWeight(x, y, z) {
  if (![x,y,z].every(Number.isFinite)) return 0;
  // The angular field otherwise carries longitudinal crests all the way into
  // the rounded inferior cap, where they converge into a starburst. Terminate
  // those crests smoothly rather than preserve a radial pattern at the axis.
  // The .19 limit and this y envelope are artistic tuning, not clinical sizes.
  return smooth(-4.3,-4.1,y)*(1-smooth(-3.4,-2.65,y))*(1-smooth(-.75,1.25,x));
}

export function gastricRefinementWeight(x, y, z) {
  return Math.max(bodyRefinementWeight(x,y,z),gastricCapWeight(x,y,z));
}

function ribbonRelief(x, y, z) {
  const radius = Math.hypot(x + 1.65, z), angle = Math.atan2(z, x + 1.65);
  let relief = 0;
  for (const [azimuth, width, height, bottom, top, tilt, phase] of ribbons) {
    const end = smooth(bottom, bottom + .85, y)*(1 - smooth(top - .9, top, y));
    const center = azimuth + tilt*y + .13*Math.sin(y*.73 + phase);
    const wrapped = Math.atan2(Math.sin(angle - center), Math.cos(angle - center));
    const arc = wrapped*radius, w = width*(1 + .14*Math.sin(y*.91 + phase));
    relief += height*end*Math.exp(-.5*(arc/w)**2);
  }
  // A short oblique branch joins one body ribbon; its ends vanish smoothly.
  const branchEnd = smooth(-1.6, -.7, y)*(1 - smooth(.7, 1.45, y));
  const branchAngle = -1.18 + .25*(y + .2);
  const branchArc = Math.atan2(Math.sin(angle - branchAngle), Math.cos(angle - branchAngle))*radius;
  relief += .045*branchEnd*Math.exp(-.5*(branchArc/.30)**2);
  return relief;
}

function relaxation(x, y, z, strength, diseaseAlpha) {
  const protect = 1 - smooth(.005, .10, clamp(diseaseAlpha));
  const body = bodyRefinementWeight(x,y,z), cap = gastricCapWeight(x,y,z);
  if ((!body && !cap) || !protect) return 0;
  const original = Math.max(0, tissueField(x,y,z) - field(x,y,z));
  // Only remove existing relief. Ribbons preserve irregular broad portions of
  // existing rugae, never push a trough inward into the navigable lumen.
  const bodyRelief = clamp(original-ribbonRelief(x,y,z),0,MAX_BODY_RELAXATION)*body;
  const capRelief = clamp(original,0,MAX_GASTRIC_RELAXATION);
  return (bodyRelief*(1-cap)+capRelief*cap)*protect*strength;
}

function retainFaceOrientation(geometry, original) {
  const p=geometry.getAttribute('position'),index=geometry.index;
  const corner=i=>index?index.getX(i):i,count=index?index.count:p.count;
  const keys=index?null:Array.from({length:p.count},(_,i)=>`${Math.round(original.getX(i)*1e5)},${Math.round(original.getY(i)*1e5)},${Math.round(original.getZ(i)*1e5)}`);
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),oldNormal=new T.Vector3(),newNormal=new T.Vector3();
  const face=(attribute,i,out)=>{
    a.fromBufferAttribute(attribute,corner(i));b.fromBufferAttribute(attribute,corner(i+1));c.fromBufferAttribute(attribute,corner(i+2));
    return out.copy(b).sub(a).cross(c.sub(a));
  };
  // Marching tetrahedra can have extremely thin sliver triangles. Small smooth
  // vertex offsets can reverse those despite a bounded displacement. Reduce
  // only implicated offsets, sharing reductions at duplicate corners.
  for(let pass=0;pass<12;pass++) {
    const implicated=new Set();
    for(let i=0;i+2<count;i+=3) {
      face(original,i,oldNormal);face(p,i,newNormal);
      if(oldNormal.lengthSq()<1e-16)continue;
      if(oldNormal.dot(newNormal)>0)continue;
      for(let j=0;j<3;j++) {const vertex=corner(i+j);implicated.add(index?vertex:keys[vertex]);}
    }
    if(!implicated.size)return;
    const fraction=pass<8?.5:0;
    for(let i=0;i<p.count;i++)if(implicated.has(index?i:keys[i])) {
      p.setXYZ(i,original.getX(i)+(p.getX(i)-original.getX(i))*fraction,original.getY(i)+(p.getY(i)-original.getY(i))*fraction,original.getZ(i)+(p.getZ(i)-original.getZ(i))*fraction);
    }
  }
  // Fail closed for an unusual source whose near-degenerate faces do not admit
  // local relaxation: original positions still receive smooth normal repair.
  p.copy(original);
}

function smoothNormals(geometry, sourceNormals) {
  geometry.computeVertexNormals();
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
  // The decoded main meshes are indexed. Raw marching-tetrahedra geometries
  // repeat triangle corners; share their area-weighted normals without welding
  // positions or changing independent disease attributes.
  if (!geometry.index) {
    const sums = new Map(), keys = new Array(p.count), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      const key = `${Math.round(p.getX(i)*1e5)},${Math.round(p.getY(i)*1e5)},${Math.round(p.getZ(i)*1e5)}`;
      keys[i] = key;
      if (!sums.has(key)) sums.set(key, new T.Vector3());
    }
    for (let i = 0; i + 2 < p.count; i += 3) {
      a.fromBufferAttribute(p,i); b.fromBufferAttribute(p,i+1); c.fromBufferAttribute(p,i+2);
      b.sub(a); c.sub(a); b.cross(c);
      for (let j = 0; j < 3; j++) sums.get(keys[i+j]).add(b);
    }
    for (let i = 0; i < p.count; i++) { a.copy(sums.get(keys[i])).normalize(); n.setXYZ(i,a.x,a.y,a.z); }
  }
  const v = new T.Vector3(), previous = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(n,i);
    if (sourceNormals) previous.fromBufferAttribute(sourceNormals,i); else previous.copy(gradient(p.getX(i),p.getY(i),p.getZ(i)));
    if (v.lengthSq() < 1e-12 || ![v.x,v.y,v.z].every(Number.isFinite)) v.copy(previous);
    // Retain analytic normals away from the affected stomach region.
    v.lerp(previous,1-gastricRefinementWeight(p.getX(i),p.getY(i),p.getZ(i))).normalize();
    // A relaxed polar cap follows the smooth chamber normal, avoiding tiny
    // marching-tetra faces appearing as square highlights on the wet surface.
    const cap=gastricCapWeight(p.getX(i),p.getY(i),p.getZ(i));
    if(cap>0)v.lerp(gradient(p.getX(i),p.getY(i),p.getZ(i)),cap).normalize();
    n.setXYZ(i,v.x,v.y,v.z);
  }
  n.needsUpdate = true;
}

/**
 * Disabled returns source unchanged. Enabled returns a caller-owned clone;
 * dispose that clone on case changes/disposal, independently of MeshAssets.
 * It preserves source topology and attributes and only relaxes walls outward.
 * The original collision field therefore remains the conservative boundary.
 */
export function refineGastricSurface(source, {enabled = false, strength = 1} = {}) {
  if (!enabled) return source;
  const p = source?.getAttribute?.('position');
  if (!p || p.itemSize !== 3) throw new TypeError('Gastric refinement needs a three-component position attribute.');
  for (let i = 0; i < p.count; i++) if (![p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite)) throw new TypeError('Gastric refinement needs finite positions.');
  const amount = Number.isFinite(strength) ? clamp(strength) : 0;
  const geometry = source.clone(), out = geometry.getAttribute('position'), disease = source.getAttribute('diseaseAppearance');
  const direction = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const alpha = disease?.itemSize >= 4 ? disease.getW(i) : 0;
    const distance = relaxation(x,y,z,amount,Number.isFinite(alpha)?alpha:1);
    if (!distance) continue;
    direction.copy(gradient(x,y,z));
    out.setXYZ(i,x+direction.x*distance,y+direction.y*distance,z+direction.z*distance);
  }
  out.needsUpdate = true;
  retainFaceOrientation(geometry,p);
  smoothNormals(geometry,source.getAttribute('normal'));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
