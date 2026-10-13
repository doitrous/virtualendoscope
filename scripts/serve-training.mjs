import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,SHARED_MODULES,PUBLIC_EXTENSIONS,OFFLINE_FILES,selectedMeshManifest} from './build-training.mjs';

const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.bin':'application/octet-stream'};
export function parseRange(header,size){
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2])||size===0)return false;
 let start,end;
 if(!match[1]){const suffix=Number(match[2]);if(!suffix)return false;start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start<size&&start<=end?{start,end}:false;
}
export async function createTrainingServer({root=ROOT,dist=false}={}){
 const publicRoot=dist?path.join(root,'dist'):root;
 const manifest=dist?null:await selectedMeshManifest(root);
 const meshFiles=new Set(manifest?Object.values(manifest).flatMap(entry=>[entry.main,entry.map]):[]);
 const server=http.createServer(async(req,res)=>{
  const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});res.end(message);};
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');fail(405,'Method not allowed');return;}
  try{
   const pathname=decodeURIComponent(req.url.split('?')[0]);
   if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part==='.'||part==='..'||part.startsWith('.'))){fail(403,'Forbidden');return;}
   let relative=pathname==='/'?'training/index.html':pathname.replace(/^\//,'');
   if(relative.endsWith('/'))relative+='index.html';
   if(!PUBLIC_EXTENSIONS.has(path.extname(relative))||relative.includes('.test.')||OFFLINE_FILES.has(path.basename(relative))){fail(404,'Not found');return;}
   if(!dist){
    const sharedPrefix='prototypes/upper-gi-mesh/';
    if(relative===sharedPrefix+'assets/meshes/manifest.json'){
     const body=JSON.stringify(manifest);res.writeHead(200,{'Content-Type':MIME['.json'],'Cache-Control':'no-cache','Content-Length':Buffer.byteLength(body)});res.end(req.method==='HEAD'?undefined:body);return;
    }
    if(relative.startsWith(sharedPrefix)){
     const rest=relative.slice(sharedPrefix.length);
     if(!SHARED_MODULES.includes(rest)&&!(rest.startsWith('assets/meshes/')&&meshFiles.has(rest.slice('assets/meshes/'.length)))){fail(404,'Not found');return;}
    }else if(relative.startsWith('vendor/three/')){
     const rest=relative.slice('vendor/three/'.length);
     if(rest!=='build/three.module.js'&&!(rest.startsWith('examples/jsm/')&&rest.endsWith('.js'))){fail(404,'Not found');return;}
     relative='node_modules/three/'+rest;
    }else if(relative.startsWith('vendor/font/')){
     relative='node_modules/@fontsource-variable/figtree/'+relative.slice('vendor/font/'.length);
    }else if(!relative.startsWith('training/')){fail(404,'Not found');return;}
   }
   const resolved=path.resolve(publicRoot,relative),realRoot=await fsp.realpath(publicRoot),realFile=await fsp.realpath(resolved);
   if(!realFile.startsWith(realRoot+path.sep)){fail(403,'Forbidden');return;}
   // Legacy reference and private paths are never public, even if placed in output.
   if(relative.split('/').some(part=>['references','private'].includes(part))){fail(404,'Not found');return;}
   const stat=await fsp.stat(realFile);if(!stat.isFile()){fail(404,'Not found');return;}
   const range=parseRange(req.headers.range,stat.size);
   if(range===false){res.setHeader('Content-Range',`bytes */${stat.size}`);fail(416,'Range not satisfiable');return;}
   const headers={'Content-Type':MIME[path.extname(realFile)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Content-Length':range?range.end-range.start+1:stat.size};
   if(range)headers['Content-Range']=`bytes ${range.start}-${range.end}/${stat.size}`;
   res.writeHead(range?206:200,headers);
   if(req.method==='HEAD'||stat.size===0){res.end();return;}
   const stream=fs.createReadStream(realFile,range||{});stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch(error){fail(error instanceof URIError?400:404,'Not found');}
 });
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=await createTrainingServer({dist:process.argv.includes('--dist')});
 const port=Number(process.env.PORT)||5194;
 server.listen(port,'0.0.0.0',()=>console.log(`Endoscopy training suite: http://127.0.0.1:${port}`));
}
