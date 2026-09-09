import fs from 'node:fs';import crypto from 'node:crypto';
import * as T from 'three';import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {buildGeometry} from './anatomy.mjs';import {createDiseaseModel,colorDiseaseGeometry} from './disease-model.mjs';import {cases,activeIds} from './disease-catalog.mjs';import {encodeGeometry,meshKey} from './mesh-assets.mjs';
const output=new URL('./assets/meshes/',import.meta.url);fs.mkdirSync(output,{recursive:true});const manifest={};
for(const c of cases)for(const related of c.related?[false,true]:[false]){
 const ids=activeIds(c.id,related),key=meshKey(ids);if(manifest[key])continue;
 const model=createDiseaseModel(ids),entry={};const started=performance.now();
 for(const [kind,step] of [['main',.12],['map',.28]]){
  const raw=buildGeometry(step,model.field);if(kind==='main')colorDiseaseGeometry(raw,model,T);
  const geometry=mergeVertices(raw,1e-5),data=Buffer.from(encodeGeometry(geometry)),hash=crypto.createHash('sha256').update(data).digest('hex').slice(0,12);
  const name=key+'.'+kind+'.'+hash+'.bin';fs.writeFileSync(new URL(name,output),data);entry[kind]=name;raw.dispose();geometry.dispose();
 }
 manifest[key]=entry;console.log(key,Math.round(performance.now()-started)+'ms');
}
fs.writeFileSync(new URL('manifest.json',output),JSON.stringify(manifest,null,2));console.log('Prepared',Object.keys(manifest).length,'cases/combinations.');
