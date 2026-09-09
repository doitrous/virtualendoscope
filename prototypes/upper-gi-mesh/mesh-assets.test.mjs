import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {MeshAssets,decodeGeometry,meshKey} from './mesh-assets.mjs';import {cases,activeIds} from './disease-catalog.mjs';
const root=new URL('./assets/meshes/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
const read=file=>{const b=fs.readFileSync(new URL(file,root));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
test('every case and combination has readable indexed prepared geometry',()=>{
 for(const c of cases)for(const related of [false,true]){const entry=manifest[meshKey(activeIds(c.id,related))];assert.ok(entry,c.id);for(const file of [entry.main,entry.map]){const g=decodeGeometry(read(file));assert.ok(g.index.count>0);assert.ok(g.attributes.position.count>0);g.dispose();}}
});
test('parallel requests deduplicate, repeat selection is cached, cache stays bounded',async()=>{
 let requests=0;const store=new MeshAssets(manifest,{limit:2,fetcher:async url=>{requests++;return {ok:true,arrayBuffer:async()=>read(url.pathname.split('/').at(-1))};}});
 const [a,b]=await Promise.all([store.get(['normal']),store.get(['normal'])]);assert.equal(a,b);assert.equal(requests,2);store.activate(a);
 assert.equal(await store.get(['normal']),a);assert.equal(requests,2);
 for(const id of ['reflux-b','varices','inlet'])await store.preload([id]);assert.ok(store.cache.size<=2);assert.ok(store.cache.has('normal'));
});
test('failed requests can retry without poisoning cache',async()=>{
 let fail=true;const store=new MeshAssets(manifest,{fetcher:async url=>({ok:!fail,arrayBuffer:async()=>read(url.pathname.split('/').at(-1))})});
 await assert.rejects(store.get(['normal']));assert.equal(store.pending.size,0);fail=false;assert.ok(await store.get(['normal']));
});
test('runtime does not rebuild meshes on the UI thread',()=>{
 const main=fs.readFileSync(new URL('./main.js',import.meta.url),'utf8');assert.ok(!main.includes('buildGeometry('));assert.ok(!main.includes('colorDiseaseGeometry('));
});
