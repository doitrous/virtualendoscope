import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {decodeGeometry} from '../prototypes/upper-gi-mesh/mesh-assets.mjs';
import {field,gradient} from '../prototypes/upper-gi-mesh/anatomy.mjs';
import {tissueField} from '../prototypes/upper-gi-mesh/tissue.mjs';
import {refineGastricSurface,gastricRefinementWeight,gastricCapWeight,MAX_BODY_RELAXATION,MAX_GASTRIC_RELAXATION} from './anatomy-surface.mjs';

function normalMesh() {
  const root=new URL('../prototypes/upper-gi-mesh/assets/meshes/',import.meta.url);
  const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root),'utf8'));
  const data=fs.readFileSync(new URL(manifest.normal.main,root));
  return decodeGeometry(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
}

test('refinement is opt-in, locally owned and preserves source topology and attributes',()=>{
  const source=normalMesh(),before=source.getAttribute('position').array.slice();
  assert.equal(refineGastricSurface(source),source);
  const refined=refineGastricSurface(source,{enabled:true});
  assert.notEqual(refined,source);
  assert.notEqual(refined.getAttribute('position').array,source.getAttribute('position').array);
  assert.deepEqual(source.getAttribute('position').array,before);
  assert.deepEqual(refined.index.array,source.index.array);
  assert.deepEqual(refined.getAttribute('diseaseAppearance').array,source.getAttribute('diseaseAppearance').array);
  assert.equal(refined.getAttribute('position').count,source.getAttribute('position').count);
  let disposed=0;source.addEventListener('dispose',()=>disposed++);
  refined.dispose();assert.equal(disposed,0);
  source.dispose();
});

test('body relaxation is finite, bounded and outward; original collision surface stays conservative',()=>{
  const source=normalMesh(),refined=refineGastricSurface(source,{enabled:true});
  const p=source.getAttribute('position'),q=refined.getAttribute('position'),n=refined.getAttribute('normal');
  let moved=0,untouched=0;
  const offset=new T.Vector3();
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=q.getX(i),b=q.getY(i),c=q.getZ(i);
    assert.ok([a,b,c,n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
    offset.set(a-x,b-y,c-z);const distance=offset.length();
    assert.ok(distance<=MAX_GASTRIC_RELAXATION+1e-6);
    if(gastricCapWeight(x,y,z)===0)assert.ok(distance<=MAX_BODY_RELAXATION+1e-6);
    if(distance>1e-6) {
      moved++;assert.ok(offset.dot(gradient(x,y,z))>=0);
      assert.ok(field(a,b,c)>=field(x,y,z)-1e-6);
      assert.ok(tissueField(a,b,c)>=tissueField(x,y,z)-1e-5,'existing collision relief remains inside the relaxed surface');
    }
    if(gastricRefinementWeight(x,y,z)===0) {untouched++;assert.equal(distance,0);}
  }
  assert.ok(moved>1000);assert.ok(untouched>1000);
  assert.ok(Number.isFinite(refined.boundingSphere.radius));
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),oldNormal=new T.Vector3(),newNormal=new T.Vector3();
  const index=source.index;
  function face(attribute,i,out) {
    a.fromBufferAttribute(attribute,index.getX(i));b.fromBufferAttribute(attribute,index.getX(i+1));c.fromBufferAttribute(attribute,index.getX(i+2));
    return out.copy(b).sub(a).cross(c.sub(a));
  }
  for(let i=0;i<index.count;i+=3) {
    face(p,i,oldNormal);face(q,i,newNormal);
    if(oldNormal.lengthSq()>1e-16)assert.ok(oldNormal.dot(newNormal)>0,'outward relaxation cannot reverse a source face');
  }
  source.dispose();refined.dispose();
});

test('cached lower-cap crests are relaxed without an axis fade or movement at gastric openings',()=>{
  const source=normalMesh(),refined=refineGastricSurface(source,{enabled:true});
  const p=source.getAttribute('position'),q=refined.getAttribute('position');
  let capMoved=0,axisCapMoved=0,protectedVertices=0,maxCapMove=0;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const distance=Math.hypot(q.getX(i)-x,q.getY(i)-y,q.getZ(i)-z);
    if(y<-3.2&&x<-.75&&distance>1e-5){capMoved++;maxCapMove=Math.max(maxCapMove,distance);if(Math.hypot(x+1.5,z)<1)axisCapMoved++;}
    if(x>=1.25||y>=3.75){protectedVertices++;assert.equal(distance,0);}
  }
  assert.ok(capMoved>500);assert.ok(axisCapMoved>50);assert.ok(maxCapMove>.11);
  assert.ok(protectedVertices>1000);
  assert.equal(gastricCapWeight(-1.5,-3.6,0),1);
  assert.equal(gastricCapWeight(-1.5,-2.65,0),0);
  assert.equal(gastricCapWeight(-1.5,-4.3,0),0);
  assert.ok(gastricCapWeight(-1.5,-3.2,0)>gastricCapWeight(-1.5,-2.8,0));
  source.dispose();refined.dispose();
});

test('cardia, antrum, outlet and esophagus remain protected by regional fade',()=>{
  for(const point of [[.05,3.25,0],[.2,6,0],[1.25,-2.4,1],[3.35,-2.3,.4],[5,-4,.5],[-1.65,.2,0]]) assert.equal(gastricRefinementWeight(...point),0);
  assert.ok(gastricRefinementWeight(-3,.2,1)>.9);
  assert.ok(gastricRefinementWeight(-3,3.4,1)<gastricRefinementWeight(-3,1,1));
  assert.ok(gastricRefinementWeight(.9,-2.3,1)<gastricRefinementWeight(-3,.2,1));
});

test('authored disease surfaces remain fixed and strength is bounded',()=>{
  const source=normalMesh(),appearance=source.getAttribute('diseaseAppearance');
  for(let i=0;i<appearance.count;i++) appearance.setW(i,1);
  const protectedMesh=refineGastricSurface(source,{enabled:true});
  assert.deepEqual(protectedMesh.getAttribute('position').array,source.getAttribute('position').array);
  for(let i=0;i<appearance.count;i++) appearance.setW(i,0);
  const zero=refineGastricSurface(source,{enabled:true,strength:NaN});
  assert.deepEqual(zero.getAttribute('position').array,source.getAttribute('position').array);
  source.dispose();protectedMesh.dispose();zero.dispose();
});

test('raw non-indexed geometry shares normals across matching triangle corners',()=>{
  const source=new T.BufferGeometry();
  source.setAttribute('position',new T.Float32BufferAttribute([-2.3,-.5,1.8,-1.2,-.5,1.8,-1.2,.5,1.8,-2.3,-.5,1.8,-1.2,.5,1.8,-2.3,.5,1.8],3));
  source.computeVertexNormals();
  const refined=refineGastricSurface(source,{enabled:true}),n=refined.getAttribute('normal');
  assert.equal(refined.index,null);
  for(const [a,b] of [[0,3],[2,4]]) for(const getter of ['getX','getY','getZ']) assert.ok(Math.abs(n[getter](a)-n[getter](b))<1e-6);
  source.dispose();refined.dispose();
});

test('invalid source positions are rejected before cloning',()=>{
  assert.throws(()=>refineGastricSurface(new T.BufferGeometry(),{enabled:true}),/position attribute/);
  const source=new T.BufferGeometry();source.setAttribute('position',new T.Float32BufferAttribute([NaN,0,0],3));
  assert.throws(()=>refineGastricSurface(source,{enabled:true}),/finite positions/);source.dispose();
});
