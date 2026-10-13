import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,buildTraining} from '../scripts/build-training.mjs';
import {decodeGeometry,meshKey} from '../prototypes/upper-gi-mesh/mesh-assets.mjs';
import {cases} from './content/cases.mjs';
import {clinicalAtlas} from './content/clinical-atlas.mjs';

test('standalone training output resolves its actual browser dependency graph and every case asset',async()=>{
 const dist=await buildTraining();
 const index=await fs.readFile(path.join(dist,'index.html'),'utf8');
 const imports=JSON.parse(index.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 const checked=new Set();
 function resolve(specifier,from){
  if(specifier.startsWith('.'))return path.resolve(path.dirname(from),specifier);
  if(specifier.startsWith('/'))return path.join(dist,specifier);
  const key=Object.keys(imports).sort((a,b)=>b.length-a.length).find(key=>specifier===key||key.endsWith('/')&&specifier.startsWith(key));
  assert.ok(key,`Missing import-map entry: ${specifier} from ${from}`);
  return path.join(dist,imports[key]+specifier.slice(key.length));
 }
 async function inspect(file){
  if(checked.has(file))return;checked.add(file);
  assert.ok(file.startsWith(dist+path.sep),'Dependency escapes published output: '+file);
  const source=await fs.readFile(file,'utf8');
  assert.doesNotMatch(source,/\b(?:import|export)\s[^;]*?['"]node:/,'Node-only code in browser graph: '+file);
  const dependencies=[...source.matchAll(/\b(?:import|export)\s+(?:[^;]*?\bfrom\s*)?['"]([^'"]+)['"]/g)].map(match=>match[1]);
  for(const dependency of dependencies)await inspect(resolve(dependency,file));
 }
 await inspect(path.join(dist,'training/app.mjs'));
 for(const runtime of ['world.mjs','endoscope.mjs','session.mjs','pathology.mjs','synthetic-tissue.mjs','content/cases.mjs','content/curriculum.mjs'])assert.ok(checked.has(path.join(dist,'training',runtime)),'Required runtime missing: '+runtime);
 // Assets advertised by the actual entry point and stylesheet must exist.
 const resolveAsset=(url,from)=>url.startsWith('/')?path.join(dist,url):path.resolve(path.dirname(from),url);
 for(const match of index.matchAll(/(?:src|href)="([^"#]+)"/g))await fs.access(resolveAsset(match[1],path.join(dist,'index.html')));
 // Modal images resolve against the document at /, not the module directory.
 const appSource=await fs.readFile(path.join(dist,'training/app.mjs'),'utf8');
 for(const match of appSource.matchAll(/src="([^"$]+)"/g)){
  if(!match[1].startsWith('data:'))await fs.access(resolveAsset(match[1],path.join(dist,'index.html')));
 }
 for(const reference of clinicalAtlas)if(reference.src)await fs.access(resolveAsset(reference.src,path.join(dist,'index.html')));
 const cssFile=path.join(dist,'training/styles.css'),css=await fs.readFile(cssFile,'utf8');
 for(const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){if(!match[1].startsWith('data:'))await fs.access(resolveAsset(match[1],cssFile));}
 const folder=path.join(dist,'prototypes/upper-gi-mesh/assets/meshes'),manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
 for(const c of cases){
  const entry=manifest[meshKey(c.meshCaseIds)];assert.ok(entry,'Unpackaged training case: '+c.id);
  for(const file of [entry.main,entry.map]){
   const buffer=await fs.readFile(path.join(folder,file));
   const geometry=decodeGeometry(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
   assert.ok(geometry.attributes.position.count>0,'Empty case mesh: '+c.id);
   assert.ok(geometry.attributes.diseaseAppearance.count===geometry.attributes.position.count,'Missing appearance attribute: '+c.id);geometry.dispose();
  }
 }
 for(const blocked of ['training/prepare-assets.mjs','training/session.test.mjs','prototypes/upper-gi-mesh/references','prototypes/upper-gi-mesh/main.js','.openai','.git','package.json'])assert.equal(await fs.stat(path.join(dist,blocked)).then(()=>true,()=>false),false,'Unexpected published source: '+blocked);
 assert.equal(Object.keys(manifest).length,new Set(cases.map(c=>meshKey(c.meshCaseIds))).size,'Unexpected extra clinical case assets');
 assert.ok(checked.size>15,'Dependency closure was not inspected');
});
