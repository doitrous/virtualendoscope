import test from 'node:test';
import assert from 'node:assert/strict';
import {savedCheckpoint,validCapture,loadSessionImages,needsLiveView} from './app-lifecycle.mjs';

test('saved checkpoints remain independent of live session and scope mutations',()=>{
 const session={id:'session-1',photos:[{id:'photo-1'}],observations:['body']},scope={progress:.5,gas:0,lens:.4};
 const saved=savedCheckpoint(session,scope,100);
 session.photos.push({id:'photo-2'});session.observations[0]='antrum';scope.progress=0;
 assert.deepEqual(saved,{session:{id:'session-1',photos:[{id:'photo-1'}],observations:['body']},scope:{progress:.5,gas:0,lens:.4},savedAt:100});
 saved.session.photos[0].id='changed';assert.equal(session.photos[0].id,'photo-1');
 assert.equal(savedCheckpoint(session,undefined,100).scope,null);
});

test('capture rejects missing, oversized, and non-JPEG pixels before crediting a photo',()=>{
 assert.equal(validCapture('data:image/jpeg;base64,/9j/AAAA'),true);
 for(const pixels of [undefined,null,'','data:,','data:image/png;base64,/9j/AAAA','data:image/jpeg;base64,AAAAAA==','data:image/jpeg;base64,/9j/!AAA','data:image/jpeg;base64,/9j/AAA','data:image/jpeg;base64,/9j/'+ 'A'.repeat(4000000)])assert.equal(validCapture(pixels),false);
});

test('image hydration is bound to the captured session ID and finishes after storage resolves',async()=>{
 let resolve;const calls=[];
 const pending=loadSessionImages(id=>{calls.push(id);return new Promise(done=>resolve=done);},'session-old');
 const pixels=new Map([['photo-1','data:image/jpeg;base64,/9j/AAAA']]);
 let finished=false;pending.then(()=>finished=true);
 await Promise.resolve();assert.equal(finished,false);assert.deepEqual(calls,['session-old']);
 resolve(pixels);assert.deepEqual(await pending,{photos:pixels,error:null});
});

test('storage rejection is handled while the parallel scope load is still pending',async()=>{
 const error=Error('IndexedDB unavailable');
 const pending=loadSessionImages(async()=>{throw error;},'session-1');
 await new Promise(resolve=>setTimeout(resolve,0));
 const result=await pending;
 assert.equal(result.error,error);assert.deepEqual(result.photos,new Map());
});

test('stored photos cannot inject markup or non-image content into the gallery',async()=>{
 const valid='data:image/jpeg;base64,/9j/AAAA';
 const result=await loadSessionImages(async()=>new Map([['photo-1',valid],['photo-2','x" onerror="alert(1)'],['unknown',valid]]),'session-1');
 assert.deepEqual([...result.photos],[['photo-1',valid]]);
 assert.ok((await loadSessionImages(async()=>({}),'session-1')).error);
});

test('renderer readiness gates examination evidence and resuming, while records and safety response remain available',()=>{
 for(const type of ['OBSERVE','PHOTO','FINDING','BIOPSY'])assert.equal(needsLiveView({type}),true);
 assert.equal(needsLiveView({type:'PAUSE',value:false}),true);
 for(const action of [{type:'PAUSE',value:true},{type:'RESPONSE'},{type:'RESOLVE'},{type:'REPORT'},{type:'TICK'}])assert.equal(needsLiveView(action),false);
});
