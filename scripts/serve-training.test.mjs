import test from 'node:test';
import assert from 'node:assert/strict';
import {Writable} from 'node:stream';
import {createTrainingServer,parseRange} from './serve-training.mjs';

test('range parsing supports bounded, open and suffix requests',()=>{
 assert.deepEqual(parseRange('bytes=1-4',10),{start:1,end:4});
 assert.deepEqual(parseRange('bytes=6-',10),{start:6,end:9});
 assert.deepEqual(parseRange('bytes=-3',10),{start:7,end:9});
 for(const invalid of ['bytes=10-','bytes=4-2','bytes=-0','bytes=0-1,3-4','other=0-2'])assert.equal(parseRange(invalid,10),false);
});

test('preview exposes training and selected meshes while blocking repository and media',async()=>{
 const server=await createTrainingServer();
 // Dispatch through the actual HTTP request listener without requiring a
 // network port, so this security gate also runs in restricted workspaces.
 const request=(url,headers={},method='GET')=>new Promise((resolve,reject)=>{
  const chunks=[],responseHeaders={};let status=200;
  const response=new Writable({write(chunk,encoding,done){chunks.push(Buffer.from(chunk));done();}});
  response.setHeader=(name,value)=>responseHeaders[name.toLowerCase()]=value;
  response.writeHead=(code,values={})=>{status=code;for(const [name,value] of Object.entries(values))response.setHeader(name,value);};
  response.on('finish',()=>resolve({status,headers:responseHeaders,body:Buffer.concat(chunks)}));response.on('error',reject);
  server.emit('request',{url,headers:Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value])),method},response);
 });
  const index=await request('/');assert.equal(index.status,200);assert.match(index.body.toString(),/id="app"/);
  const manifestResponse=await request('/prototypes/upper-gi-mesh/assets/meshes/manifest.json');assert.equal(manifestResponse.status,200);
  const manifest=JSON.parse(manifestResponse.body);for(const id of ['normal','reflux-b','duodenal-ulcer','varices','celiac'])assert.ok(manifest[id]);
  const mesh='/prototypes/upper-gi-mesh/assets/meshes/'+manifest.normal.main;
  const range=await request(mesh,{Range:'bytes=0-15'});assert.equal(range.status,206);assert.equal(range.body.length,16);assert.match(range.headers['content-range'],/^bytes 0-15\//);
  const invalid=await request(mesh,{Range:'bytes=999999999999-'});assert.equal(invalid.status,416);
  const head=await request(mesh,{},'HEAD');assert.equal(head.status,200);assert.equal(head.body.length,0);
  for(const url of ['/package.json','/prototypes/upper-gi-mesh/main.js','/prototypes/upper-gi-mesh/references/Esophagus.jpg','/.git/config','/training/%2e%2e/package.json','/training/%5cpackage.json']){
   const response=await request(url);assert.ok([403,404].includes(response.status),url+' leaked');
  }
  assert.equal((await request('/vendor/three/build/three.module.js',{},'POST')).status,405);
});
