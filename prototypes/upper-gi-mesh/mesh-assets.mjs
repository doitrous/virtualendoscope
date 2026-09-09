import * as T from 'three';
export const meshKey=ids=>[...ids].sort().join('+');
export function encodeGeometry(g){
 const count=g.attributes.position.count,index=g.index?.array||new Uint32Array();
 const buffer=new ArrayBuffer(16+count*40+index.length*4),head=new Uint32Array(buffer,0,4);head.set([0x4c554d32,count,index.length,1]);
 let offset=16;
 for(const [name,size] of [['position',3],['normal',3],['diseaseAppearance',4]]){
  new Float32Array(buffer,offset,count*size).set(g.attributes[name]?.array||new Float32Array(count*size));offset+=count*size*4;
 }
 new Uint32Array(buffer,offset,index.length).set(index);return buffer;
}
export function decodeGeometry(buffer){
 const head=new Uint32Array(buffer,0,4),count=head[1],indices=head[2];
 if(head[0]!==0x4c554d32||head[3]!==1||buffer.byteLength!==16+count*40+indices*4)throw Error('Invalid mesh asset');
 const g=new T.BufferGeometry();let offset=16;
 for(const [name,size] of [['position',3],['normal',3],['diseaseAppearance',4]]){g.setAttribute(name,new T.BufferAttribute(new Float32Array(buffer,offset,count*size),size));offset+=count*size*4;}
 if(indices)g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,offset,indices),1));
 g.computeBoundingSphere();return g;
}
// Keep a bounded set of decoded CPU/GPU buffers, including the visible case.
export class MeshAssets{
 constructor(manifest,{fetcher=(...args)=>fetch(...args),limit=4}={}){this.manifest=manifest;this.fetcher=fetcher;this.limit=limit;this.cache=new Map();this.pending=new Map();this.active=null;}
 async get(ids){const key=meshKey(ids);
  if(this.cache.has(key)){const item=this.cache.get(key);this.cache.delete(key);this.cache.set(key,item);return item;}
  if(this.pending.has(key))return this.pending.get(key);
  const entry=this.manifest[key];if(!entry)throw Error('Case asset missing: '+key);
  const job=Promise.all([entry.main,entry.map].map(async file=>{const response=await this.fetcher(new URL('./assets/meshes/'+file,import.meta.url),{cache:'force-cache'});if(!response.ok)throw Error('Mesh could not load');return response.arrayBuffer();})).then(buffers=>{
   const item={key,main:decodeGeometry(buffers[0]),map:decodeGeometry(buffers[1])};this.cache.set(key,item);return item;
  }).finally(()=>this.pending.delete(key));this.pending.set(key,job);return job;
 }
 activate(item){this.active=item.key;this.trim();}
 trim(){for(const [key,item] of this.cache){if(this.cache.size<=this.limit)break;if(key===this.active||this.pending.has(key)||this.pinned?.has(key))continue;item.main.dispose();item.map.dispose();this.cache.delete(key);}}
 async preload(ids){try{await this.get(ids);this.trim();}catch{/* Foreground selection exposes actionable load errors. */}}
}
