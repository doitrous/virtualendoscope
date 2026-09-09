import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildGeometry } from './anatomy.mjs';
const g=buildGeometry();g.computeBoundingBox();
const p=g.attributes.position,n=g.attributes.normal;
const binary=Buffer.concat([Buffer.from(p.array.buffer),Buffer.from(n.array.buffer)]);
const doc={asset:{version:'2.0',generator:'Lumen illustrative stomach mesh checkpoint'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:'Stomach cavity — review pending',scale:[.01,.01,.01]}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},material:0}]}],
  materials:[{name:'Untextured study surface',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[.65,.4,.36,1],metallicFactor:0,roughnessFactor:.7}}],
  buffers:[{byteLength:binary.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:p.array.byteLength,target:34962},{buffer:0,byteOffset:p.array.byteLength,byteLength:n.array.byteLength,target:34962}],
  accessors:[{bufferView:0,componentType:5126,count:p.count,type:'VEC3',min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()},{bufferView:1,componentType:5126,count:n.count,type:'VEC3'}],
  extras:{clinical_validation:'none',geometry_source:'Analytic illustrative model; not patient reconstruction',units:'Scene units mapped to centimetres for illustrative scale only'}};
const text=Buffer.from(JSON.stringify(doc));const json=Buffer.alloc(Math.ceil(text.length/4)*4,0x20);text.copy(json);
const total=12+8+json.length+8+binary.length,output=Buffer.alloc(total);
output.writeUInt32LE(0x46546c67,0);output.writeUInt32LE(2,4);output.writeUInt32LE(total,8);
output.writeUInt32LE(json.length,12);output.writeUInt32LE(0x4e4f534a,16);json.copy(output,20);
const off=20+json.length;output.writeUInt32LE(binary.length,off);output.writeUInt32LE(0x004e4942,off+4);binary.copy(output,off+8);
fs.writeFileSync(fileURLToPath(new URL('./stomach-checkpoint.glb',import.meta.url)),output);
console.log(`Exported ${p.count/3} triangles, ${output.length} bytes.`);
