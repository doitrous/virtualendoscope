// Serves only the simulator and two public dependency folders on loopback.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const mounts=[['/vendor/three/',path.resolve(root,'../../node_modules/three')],['/vendor/font/',path.resolve(root,'../../node_modules/@fontsource-variable/figtree')],['/prototypes/upper-gi-mesh/',path.resolve(root)]];
const types={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.jpg':'image/jpeg','.mp4':'video/mp4','.woff2':'font/woff2','.glb':'model/gltf-binary','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/'){res.writeHead(302,{Location:'/prototypes/upper-gi-mesh/index.html'});res.end();return;}
  const mount=mounts.find(([prefix])=>url.pathname.startsWith(prefix));
  if(!mount){res.writeHead(404);res.end();return;}
  const relative=decodeURIComponent(url.pathname.slice(mount[0].length))||'index.html';
  const file=path.resolve(mount[1],relative);
  if(!file.startsWith(mount[1]+path.sep)||relative.includes('\0')){res.writeHead(403);res.end();return;}
  const stat=fs.statSync(file);if(!stat.isFile()){res.writeHead(404);res.end();return;}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  let start=0,end=stat.size-1,status=200;
  if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;status=206;if(start>end){res.writeHead(416);res.end();return;}headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
  res.writeHead(status,{...headers,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT)||5194;
server.listen(port,'0.0.0.0',()=>console.log(`Simulator listening on 0.0.0.0:${port}`));
