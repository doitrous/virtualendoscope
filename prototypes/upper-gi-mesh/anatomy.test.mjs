import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { field, landmarks, moveTip, buildGeometry } from './anatomy.mjs';

test('inspection positions lie inside the cavity with tip clearance',()=>{
  for(const l of landmarks) assert.ok(field(...l.position)<-.12,l.id);
});
test('oesophagus, body and outlet have a continuous traversable route',()=>{
  const route=[[.2,6,0],[.05,3.25,0],[-1.7,.2,0],[1.1,-2.4,0],[3.35,-2.3,0],[4.5,-2.2,0],[5.1,-3.2,0],[5,-4.6,0]];
  for(let i=1;i<route.length;i++) {
    const from=new Vector3(...route[i-1]),to=new Vector3(...route[i]);
    const distance=from.distanceTo(to),dir=to.clone().sub(from).normalize();
    assert.equal(moveTip(from,dir,distance),false,`segment ${i}`);
    assert.ok(from.distanceTo(to)<1e-6);
  }
});
test('large movement cannot tunnel through a wall; withdrawal remains possible',()=>{
  const p=new Vector3(-1.7,.2,0),dir=new Vector3(0,0,1);
  assert.equal(moveTip(p,dir,100),true);
  assert.ok(field(...p.toArray())<=-.12);
  const before=p.z;
  assert.equal(moveTip(p,dir,-.2),false);
  assert.ok(p.z<before);
});
test('surface has finite positions, unit normals and no disconnected surface components',()=>{
  const g=buildGeometry(),p=g.attributes.position.array,n=g.attributes.normal.array;
  assert.ok(p.length>10000);
  const parent=new Map(), edges=new Map();
  function root(k){if(!parent.has(k))parent.set(k,k);if(parent.get(k)!==k)parent.set(k,root(parent.get(k)));return parent.get(k);}
  for(let i=0;i<p.length;i+=9){const ids=[];for(let j=0;j<9;j+=3){const at=i+j;assert.ok([p[at],p[at+1],p[at+2]].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(n[at],n[at+1],n[at+2])-1)<1e-4);ids.push([p[at],p[at+1],p[at+2]].map(v=>v.toFixed(5)).join(','));}
    for(let j=0;j<3;j++){parent.set(root(ids[j]),root(ids[(j+1)%3]));const key=[ids[j],ids[(j+1)%3]].sort().join('|');edges.set(key,(edges.get(key)??0)+1);}
  }
  assert.equal(new Set([...parent.keys()].map(root)).size,1);
  // Tolerance-based welding should leave a closed manifold surface.
  assert.equal([...edges.values()].filter(count=>count!==2).length,0);
  g.dispose();
});
