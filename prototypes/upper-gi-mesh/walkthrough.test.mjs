import test from 'node:test';import assert from 'node:assert/strict';
import {tourStages,tourAt,tourDuration,Walkthrough} from './walkthrough.mjs';import {cases} from './disease-catalog.mjs';
test('shorter proximal-to-distal schedule with normal opening and curated exclusions',()=>{
 assert.equal(tourDuration,53);assert.deepEqual(tourStages.slice(0,4).map(s=>s.id),['normal','varices','reflux-b','reflux-d']);
 assert.equal(tourStages[1].time,3);assert.equal(tourAt(2.99).progress,0);
 for(const id of ['cancer','crohn','hernia','inlet'])assert.ok(!tourStages.some(s=>s.id===id));
 for(const s of tourStages)assert.ok(cases.some(c=>c.id===s.id));assert.ok(!cases.some(c=>c.id==='papilla'));
 let previous=0;for(let t=0;t<=70;t+=.01){const p=tourAt(t).progress;assert.ok(p>=previous-1e-10);assert.ok(p-previous<.001);previous=p;}
 assert.ok(tourAt(70).done);assert.ok(tourAt(70).progress>.98);
});
test('pause retains elapsed time and resumes without preparation or restarting',async()=>{
 let prepared=0,resumed=0;const shown=[];
 const tour=new Walkthrough({prepare:async()=>prepared++,begin:()=>{},resume:()=>resumed++,show:s=>shown.push(s.id),move:()=>{},finish:()=>{},button:{},banner:{}});
 await tour.start();for(let i=0;i<100;i++)tour.update(.05);
 const elapsed=tour.elapsed;tour.stop();assert.ok(tour.suspended);tour.update(10);assert.equal(tour.elapsed,elapsed);
 tour.continue();assert.equal(prepared,1);assert.equal(resumed,1);assert.equal(tour.elapsed,elapsed);assert.ok(tour.active);assert.equal(shown.at(-1),'varices');
});
test('plays every stage once, completes, and clamps stalls',async()=>{
 const shown=[],button={},banner={};let finished=0;
 const tour=new Walkthrough({prepare:async()=>{},begin:()=>{},show:s=>shown.push(s.id),move:()=>{},finish:()=>finished++,button,banner});
 await tour.start();tour.update(10);assert.equal(tour.elapsed,.05);
 for(let i=0;i<4201;i++)tour.update(1/60);
 assert.equal(tour.active,false);assert.equal(finished,1);assert.deepEqual(shown,tourStages.map(s=>s.id));
});
test('cancelling preparation prevents a late automatic start',async()=>{
 let resolve,began=false;const tour=new Walkthrough({prepare:()=>new Promise(r=>resolve=r),begin:()=>began=true,show:()=>{},move:()=>{},finish:()=>{},button:{},banner:{}});
 const pending=tour.start();tour.stop();resolve();await pending;assert.equal(began,false);assert.equal(tour.active,false);
});
