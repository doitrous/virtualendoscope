import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {cases,sources,activeIds} from './disease-catalog.mjs';import {createDiseaseModel} from './disease-model.mjs';import {GuidedTrack} from './guided-track.mjs';
import {buildGeometry} from './anatomy.mjs';
test('every supplied disease folder is mapped and every case has research',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('./references/diseases/manifest.json',import.meta.url)));
 const mapped=new Set(cases.flatMap(c=>c.folders));for(const f of manifest)if(f.id!=='09')assert.ok(mapped.has(f.id),f.folder);
 assert.ok(!cases.some(c=>c.id==='papilla'));
 for(const c of cases){assert.ok(c.refs.length);for(const ref of c.refs)assert.ok(sources[ref]);}
});
test('companions are opt-in and no reflux-to-gastritis inference exists',()=>{
 assert.deepEqual(activeIds('reflux-b'),['reflux-b']);assert.deepEqual(activeIds('reflux-b',true),['reflux-b','hernia']);
 assert.deepEqual(activeIds('duodenal-ulcer',true),['duodenal-ulcer','hp-gastritis']);
});
test('every disease and optional combination preserves the full guided route',()=>{
 const tr=new GuidedTrack();for(const c of cases){const model=createDiseaseModel(activeIds(c.id,true));for(let i=0;i<=600;i++){const p=tr.curve.getPointAt(i/600);assert.ok(model.field(p.x,p.y,p.z)<-.06,c.id+' at '+i);}}
});
test('disease appearance is finite and anatomically localised',()=>{
 for(const c of cases){const m=createDiseaseModel([c.id]);for(const p of [[.2,5,.35],[-2,0,1],[4.5,-2.2,.3],[5,-3.7,.4]])for(const v of m.appearance(...p))assert.ok(Number.isFinite(v),c.id);}
 assert.equal(createDiseaseModel(['reflux-b']).appearance(-2,0,1)[3],0);
 assert.equal(createDiseaseModel(['normal']).appearance(.2,5,.35)[3],0);
});
test('all disease meshes generate valid geometry',()=>{
 for(const c of cases){const m=createDiseaseModel(activeIds(c.id,true)),g=buildGeometry(.24,m.field);assert.ok(g.attributes.position.count>0,c.id);for(const v of g.attributes.position.array)assert.ok(Number.isFinite(v),c.id);g.dispose();}
});
