import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const SHARED_MODULES=['anatomy.mjs','tissue.mjs','optics.mjs','disease-model.mjs','disease-catalog.mjs','mesh-assets.mjs','guided-track.mjs','guided-scope.mjs','scope-physics.mjs'];
export const DEFAULT_CASES=['normal','reflux-b','duodenal-ulcer','varices','celiac'];
export const PUBLIC_EXTENSIONS=new Set(['.html','.mjs','.js','.css','.json','.svg','.jpg','.jpeg','.png','.webp','.woff2','.bin']);
export const OFFLINE_FILES=new Set(['prepare-assets.mjs']);
export async function selectedMeshManifest(root=ROOT){
 const folder=path.join(root,'prototypes/upper-gi-mesh/assets/meshes');
 const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
 let extras=[];
 try{extras=JSON.parse(await fs.readFile(path.join(root,'training/mesh-cases.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!Array.isArray(extras)||extras.some(id=>typeof id!=='string'))throw Error('training/mesh-cases.json must contain an array of mesh case IDs');
 const selected={};
 for(const id of new Set([...DEFAULT_CASES,...extras])){
  const entry=manifest[id];if(!entry)throw Error('Missing prepared mesh case: '+id);
  for(const key of ['main','map'])if(typeof entry[key]!=='string'||path.basename(entry[key])!==entry[key]||!entry[key].endsWith('.bin'))throw Error('Unsafe mesh asset: '+id);
  selected[id]={main:entry.main,map:entry.map};
 }
 return selected;
}
async function copyPublicTree(source,destination,extensions=PUBLIC_EXTENSIONS){
 await fs.mkdir(destination,{recursive:true});
 for(const entry of await fs.readdir(source,{withFileTypes:true})){
  if(entry.name.startsWith('.')||entry.name.includes('.test.')||OFFLINE_FILES.has(entry.name))continue;
  const from=path.join(source,entry.name),to=path.join(destination,entry.name);
  if(entry.isDirectory())await copyPublicTree(from,to,extensions);
  else if(entry.isFile()&&extensions.has(path.extname(entry.name)))await fs.copyFile(from,to);
 }
}
export async function buildTraining(root=ROOT){
 const dist=path.join(root,'dist');
 // dist is a generated output directory and is never an input to this build.
 await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(dist,{recursive:true});
 await fs.access(path.join(root,'training/app.mjs'));
 await copyPublicTree(path.join(root,'training'),path.join(dist,'training'));
 const shared=path.join(dist,'prototypes/upper-gi-mesh');await fs.mkdir(shared,{recursive:true});
 for(const file of SHARED_MODULES)await fs.copyFile(path.join(root,'prototypes/upper-gi-mesh',file),path.join(shared,file));
 const manifest=await selectedMeshManifest(root),meshFolder=path.join(shared,'assets/meshes');await fs.mkdir(meshFolder,{recursive:true});
 await fs.writeFile(path.join(meshFolder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 for(const file of new Set(Object.values(manifest).flatMap(entry=>[entry.main,entry.map])))await fs.copyFile(path.join(root,'prototypes/upper-gi-mesh/assets/meshes',file),path.join(meshFolder,file));
 const three=path.join(root,'node_modules/three'),vendor=path.join(dist,'vendor/three');await fs.mkdir(path.join(vendor,'build'),{recursive:true});
 await fs.copyFile(path.join(three,'build/three.module.js'),path.join(vendor,'build/three.module.js'));
 await copyPublicTree(path.join(three,'examples/jsm'),path.join(vendor,'examples/jsm'),new Set(['.js']));
 await fs.copyFile(path.join(three,'LICENSE'),path.join(vendor,'LICENSE'));
 const font=path.join(root,'node_modules/@fontsource-variable/figtree');
 try{await copyPublicTree(path.join(font,'files'),path.join(dist,'vendor/font/files'),new Set(['.woff2']));await fs.copyFile(path.join(font,'index.css'),path.join(dist,'vendor/font/index.css'));await fs.copyFile(path.join(font,'LICENSE'),path.join(dist,'vendor/font/LICENSE'));}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.copyFile(path.join(root,'LICENSE'),path.join(dist,'LICENSE'));
 await fs.copyFile(path.join(root,'training/index.html'),path.join(dist,'index.html'));
 console.log(`Training build complete: ${Object.keys(manifest).length} selected mesh cases; local dependencies; only attributed clinical atlas media; legacy reference media excluded.`);
 return dist;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildTraining();
