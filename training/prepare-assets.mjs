import fs from 'node:fs/promises';
import * as T from 'three';
import {buildGeometry} from '../prototypes/upper-gi-mesh/anatomy.mjs';
import {colorDiseaseGeometry} from '../prototypes/upper-gi-mesh/disease-model.mjs';
import {encodeGeometry} from '../prototypes/upper-gi-mesh/mesh-assets.mjs';
import {createTrainingPathology} from './pathology.mjs';
const root=new URL('../prototypes/upper-gi-mesh/assets/meshes/',import.meta.url);
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root),'utf8'));
for(const id of ['barrett','gastric-ulcer']) {
  const model=createTrainingPathology(id);
  const main=colorDiseaseGeometry(buildGeometry(.18,model.field),model,T);
  const map=colorDiseaseGeometry(buildGeometry(.32,model.field),model,T);
  const entry={main:`${id}.training.main.bin`,map:`${id}.training.map.bin`};
  await fs.writeFile(new URL(entry.main,root),new Uint8Array(encodeGeometry(main)));
  await fs.writeFile(new URL(entry.map,root),new Uint8Array(encodeGeometry(map)));
  manifest[id]=entry;main.dispose();map.dispose();
  console.log(`Prepared synthetic ${id} geometry`);
}
await fs.writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
