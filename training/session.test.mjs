import test from 'node:test';
import assert from 'node:assert/strict';
import { cases, landmarks, sources } from './content/cases.mjs';
import { preparationSteps, recoverySteps } from './content/curriculum.mjs';
import { createSession, transition, assess, restoreSession, exportReport, REGIONS, SESSION_VERSION } from './session.mjs';

const config = { cases, landmarks, preparationSteps, recoverySteps };
const findCase = id => cases.find(c => c.id === id);
const view = (region = 'entry', extra = {}) => ({ region, progress: .2, visibility: .9, contact: false, dwell: 3, retroflex: region === 'fundus', ...extra });
function apply(session, action) {
  const before = structuredClone(session);
  const response = transition(session, { now: 1000, ...action }, config);
  assert.deepEqual(session, before, 'transitions must not mutate the supplied state');
  assert.equal(response.ok, true, response.message);
  return response.session;
}
function refuse(session, action) {
  const before = structuredClone(session);
  const response = transition(session, { now: 1000, ...action }, config);
  assert.equal(response.ok, false, `unexpectedly accepted ${action.type}/${action.step || ''}`);
  assert.deepEqual(response.session, before, 'rejected actions must not change state');
  assert.deepEqual(session, before);
  return response;
}
function prepare(caseId) {
  let s = apply(createSession(caseId, 'guided', 0), { type: 'BRIEF' });
  s = apply(s, { type: 'POSITION', value: 'left-lateral' });
  for (const step of preparationSteps) s = apply(s, { type: 'PREPARE', id: step.id });
  return apply(s, { type: 'START' });
}
function documentFinding(s, f) {
  s = apply(s, { type: 'PHOTO', telemetry: view(f.region) });
  return apply(s, { type: 'FINDING', id: f.id, telemetry: view(f.region) });
}
function takeSamples(s, f, count, label = `${f.clinicalRegion} — specimen container`) {
  for (let i = 0; i < count; i++) {
    s = apply(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view(f.region) });
    s = apply(s, { type: 'BIOPSY', step: 'open', telemetry: view(f.region) });
    s = apply(s, { type: 'BIOPSY', step: 'sample', telemetry: view(f.region) });
    s = apply(s, { type: 'BIOPSY', step: 'retract' });
  }
  return apply(s, { type: 'BIOPSY', step: 'label', site: f.region, label });
}

test('case configuration resolves runtime sites, sources and explicit sampling targets', () => {
  const sourceIds = new Set(sources.map(s => s.id));
  assert.equal(cases.length, 7);
  assert.equal(landmarks.filter(l => l.photoRequired).length, 10);
  for (const c of cases) for (const f of c.findings) {
    assert.ok(REGIONS.includes(f.region), `${f.id}: unknown runtime region`);
    assert.ok(f.clinicalRegion, `${f.id}: clinical site must remain available`);
    for (const id of f.sourceIds) assert.ok(sourceIds.has(id), `missing source ${id}`);
    if (f.biopsy === 'required') assert.ok(Number.isInteger(f.sampleCount) && f.sampleCount > 0);
  }
  for (const l of landmarks) assert.ok(REGIONS.includes(l.runtimeRegion), `${l.id}: missing navigation mapping`);
  assert.deepEqual(findCase('suspected-barrett').meshCaseIds, ['barrett']);
  assert.deepEqual(findCase('gastric-ulcer').meshCaseIds, ['gastric-ulcer']);
  assert.equal(findCase('suspected-barrett').visualRequirement.status, 'synthetic-unvalidated');
  assert.equal(findCase('gastric-ulcer').visualRequirement.status, 'synthetic-unvalidated');
});

test('insertion requires briefing, every preparation check and correct positioning', () => {
  let s = createSession('normal-egd', 'guided', 0);
  refuse(s, { type: 'START' });
  s = apply(s, { type: 'BRIEF' });
  refuse(s, { type: 'POSITION', value: 'supine' });
  refuse(s, { type: 'PREPARE', id: 'position' });
  s = apply(s, { type: 'POSITION', value: 'left-lateral' });
  for (const step of preparationSteps.slice(0, -1)) s = apply(s, { type: 'PREPARE', id: step.id });
  refuse(s, { type: 'START' });
  s = apply(s, { type: 'PREPARE', id: preparationSteps.at(-1).id });
  assert.equal(apply(s, { type: 'START' }).phase, 'procedure');
});

test('documentation gates reject unstable views, wrong sites and uninspected retroflex views', () => {
  const s = prepare('duodenal-ulcer');
  const f = findCase(s.caseId).findings[0];
  for (const bad of [{ visibility: .3 }, { contact: true }, { dwell: 1 }]) {
    refuse(s, { type: 'OBSERVE', telemetry: view('bulb', bad) });
    refuse(s, { type: 'PHOTO', telemetry: view('bulb', bad) });
    refuse(s, { type: 'FINDING', id: f.id, telemetry: view('bulb', bad) });
  }
  refuse(s, { type: 'FINDING', id: f.id, telemetry: view('antrum') });
  refuse(s, { type: 'OBSERVE', telemetry: view('fundus', { retroflex: false }) });
  refuse(s, { type: 'PHOTO', telemetry: view('fundus', { retroflex: false }) });
  assert.deepEqual(apply(s, { type: 'OBSERVE', telemetry: view('fundus') }).observations, ['fundus']);
  const paused = apply(s, { type: 'PAUSE', value: true });
  refuse(paused, { type: 'PHOTO', telemetry: view('bulb') });
  refuse(paused, { type: 'FINDING', id: f.id, telemetry: view('bulb') });
});

test('varices are never valid biopsy targets, including an injected in-flight state', () => {
  const f = findCase('esophageal-varices').findings[0];
  const s = documentFinding(prepare('esophageal-varices'), f);
  assert.equal(f.biopsy, 'avoid');
  refuse(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view(f.region) });
  refuse({ ...s, biopsy: { stage: 'opened', findingId: f.id, sampleCount: 0 } }, { type: 'BIOPSY', step: 'sample', telemetry: view(f.region) });
  assert.equal(s.specimens.length, 0);
  assert.equal(assess(s, config).missingSamples.length, 0, 'avoided tissue must not become a completion requirement');
});

test('routine sampling is refused for uncomplicated reflux and a typical duodenal ulcer', () => {
  for (const id of ['reflux-esophagitis', 'duodenal-ulcer']) {
    const f = findCase(id).findings[0], s = documentFinding(prepare(id), f);
    refuse(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view(f.region) });
    assert.equal(assess(s, config).missingSamples.length, 0);
  }
});

test('sampling requires documented site, prior photograph and sequential forceps actions', () => {
  const f = findCase('gastric-ulcer').findings[0];
  let s = prepare('gastric-ulcer');
  refuse(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view(f.region) });
  s = apply(s, { type: 'FINDING', id: f.id, telemetry: view(f.region) });
  refuse(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view(f.region) });
  s = apply(s, { type: 'PHOTO', telemetry: view(f.region) });
  refuse(s, { type: 'BIOPSY', step: 'open', findingId: f.id, telemetry: view(f.region) });
  refuse(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view('bulb') });
  s = apply(s, { type: 'BIOPSY', step: 'introduce', findingId: f.id, telemetry: view(f.region) });
  refuse(s, { type: 'BIOPSY', step: 'sample', telemetry: view(f.region) });
  s = apply(s, { type: 'BIOPSY', step: 'open', telemetry: view(f.region) });
  refuse(s, { type: 'BIOPSY', step: 'sample', telemetry: view(f.region, { visibility: .6 }) });
  s = apply(s, { type: 'BIOPSY', step: 'sample', telemetry: view(f.region) });
  assert.equal(s.biopsy.sampleCount, 1);
  refuse(s, { type: 'END', telemetry: view('entry', { progress: 0 }) });
  s = apply(s, { type: 'BIOPSY', step: 'retract' });
  refuse(s, { type: 'BIOPSY', step: 'label', site: 'bulb', label: 'Duodenal bulb' });
  refuse(s, { type: 'BIOPSY', step: 'label', label: 'Antrum' });
  refuse(s, { type: 'BIOPSY', step: 'label', site: f.region, label: '' });
  s = apply(s, { type: 'BIOPSY', step: 'label', site: f.region, label: 'Gastric antrum ulcer' });
  assert.equal(s.specimens[0].count, 1);
  assert.equal(s.specimens[0].region, 'antrum');
  assert.ok(assess(s, config).missingSamples.some(x => x.id === f.id));
});

test('gastric ulcer and Barrett protocols require the full count, including separate containers', () => {
  for (const id of ['gastric-ulcer', 'suspected-barrett']) {
    const f = findCase(id).findings[0];
    let s = documentFinding(prepare(id), f);
    s = takeSamples(s, f, 1);
    assert.ok(assess(s, config).missingSamples.some(x => x.id === f.id), 'one sample must not complete a multi-sample protocol');
    s = takeSamples(s, f, f.sampleCount - 2);
    assert.ok(assess(s, config).missingSamples.some(x => x.id === f.id), 'one remaining sample must stay incomplete');
    s = takeSamples(s, f, 1);
    assert.equal(assess(s, config).missingSamples.length, 0);
    assert.equal(s.specimens.reduce((total, x) => total + x.count, 0), f.sampleCount);
  }
});

test('celiac sampling accounts for bulb and D2 separately without cross-credit', () => {
  const [bulb, distal] = findCase('suspected-celiac').findings;
  let s = prepare('suspected-celiac');
  s = documentFinding(documentFinding(s, bulb), distal);
  s = takeSamples(s, bulb, bulb.sampleCount + distal.sampleCount);
  assert.deepEqual(assess(s, config).missingSamples.map(f => f.id), [distal.id]);
  s = takeSamples(s, distal, distal.sampleCount - 1);
  assert.deepEqual(assess(s, config).missingSamples.map(f => f.id), [distal.id]);
  s = takeSamples(s, distal, 1);
  assert.equal(assess(s, config).missingSamples.length, 0);
  assert.ok(s.specimens.filter(x => x.findingId === bulb.id).every(x => x.region === 'bulb'));
  assert.ok(s.specimens.filter(x => x.findingId === distal.id).every(x => x.region === 'descending'));
});

test('emergency drill interrupts procedures and requires stop, help, airway and reassessment', () => {
  let s = apply(prepare('normal-egd'), { type: 'DRILL' });
  refuse(s, { type: 'PHOTO', telemetry: view() });
  refuse(s, { type: 'END', telemetry: view('entry', { progress: 0 }) });
  refuse(s, { type: 'RESPOND', id: 'airway' });
  refuse(s, { type: 'RESOLVE' });
  s = apply(s, { type: 'RESPOND', id: 'stop' });
  for (const id of ['help', 'airway']) s = apply(s, { type: 'RESPOND', id });
  refuse(s, { type: 'RESOLVE' });
  s = apply(s, { type: 'RESPOND', id: 'monitor' });
  assert.equal(apply(s, { type: 'RESOLVE' }).emergency, null);
});

test('withdrawal and debrief require accessory accounting, released retroflexion and recovery checks', () => {
  let s = prepare('normal-egd');
  refuse(s, { type: 'END', telemetry: view('entry', { progress: .5 }) });
  refuse(s, { type: 'END', telemetry: view('entry', { progress: 0, retroflex: true }) });
  s = apply(s, { type: 'END', telemetry: view('entry', { progress: 0 }) });
  refuse(s, { type: 'FINISH' });
  for (const step of recoverySteps) s = apply(s, { type: 'RECOVER', id: step.id });
  refuse(s, { type: 'FINISH' });
  s = apply(s, { type: 'REPORT', text: 'No visible focal abnormality in this exercise. Follow-up and result ownership discussed.' });
  s = apply(s, { type: 'FINISH' });
  assert.equal(s.phase, 'debrief');
  const report = exportReport(s, config);
  assert.equal(report.educationalOnly, true);
  assert.ok(report.assessment.qualityNote.includes('competence'));
  assert.ok(report.assessment.missingRegions.length, 'debrief must retain incomplete coverage rather than declare competence');
});

test('restoration pauses examination, cancels unlabelled sampling and retains a safety drill', () => {
  const f = findCase('gastric-ulcer').findings[0];
  let s = documentFinding(prepare('gastric-ulcer'), f);
  for (const step of ['introduce', 'open', 'sample']) s = apply(s, { type: 'BIOPSY', step, findingId: f.id, telemetry: view(f.region) });
  const restored = restoreSession(JSON.stringify(s), config);
  assert.ok(restored);
  assert.equal(restored.paused, true);
  assert.equal(restored.biopsy.stage, 'idle');
  assert.equal(restored.biopsy.findingId, null);
  assert.equal(restored.specimens.length, 0, 'unlabelled work must not become a specimen');
  assert.ok(assess(restored, config).missingSamples.some(x => x.id === f.id));
  assert.ok(restored.events.length > s.events.length, 'restoration must disclose cancelled in-flight sampling');
  const drill = apply(prepare('normal-egd'), { type: 'DRILL' });
  const interrupted = restoreSession(JSON.stringify(drill), config);
  assert.ok(interrupted);
  assert.equal(interrupted.paused, true);
  assert.deepEqual(interrupted.emergency, drill.emergency, 'reload must not bypass the safety response');
  refuse(interrupted, { type: 'END', telemetry: view('entry', { progress: 0 }) });
});

test('restoration preserves valid labelled specimens and rejects malformed or inconsistent payloads', () => {
  const f = findCase('gastric-ulcer').findings[0];
  const s = takeSamples(documentFinding(prepare('gastric-ulcer'), f), f, 2);
  const restored = restoreSession(JSON.stringify(s), config);
  assert.ok(restored);
  assert.deepEqual(restored.specimens, s.specimens);
  assert.ok(assess(restored, config).missingSamples.some(x => x.id === f.id));
  const broken = [
    { ...s, version: SESSION_VERSION + 1 },
    { ...s, caseId: 'missing-case' },
    { ...s, phase: 'teleport' },
    { ...s, elapsed: -1 },
    { ...s, observations: [null] },
    { ...s, photos: [null] },
    { ...s, specimens: [{ ...s.specimens[0], count: -1 }] },
    { ...s, specimens: [{ ...s.specimens[0], count: '6' }] },
    { ...s, specimens: [{ ...s.specimens[0], region: 'bulb' }] },
    { ...s, specimens: [{ ...s.specimens[0], findingId: 'made-up' }] },
    { ...s, biopsy: null },
    { ...s, events: [null] },
    { ...s, emergency: { type: 'hypoxia', actions: ['made-up'] } },
  ];
  for (const raw of broken) assert.equal(restoreSession(raw, config), null, `accepted malformed state ${JSON.stringify(raw)}`);
  assert.equal(restoreSession('{invalid json', config), null);
});

test('specimen limit blocks new instruments and still accounts for the final container',()=>{
  const f=findCase('gastric-ulcer').findings[0];
  let s=takeSamples(documentFinding(prepare('gastric-ulcer'),f),f,1);
  const specimen=s.specimens[0];
  s.specimens=Array.from({length:99},(_,i)=>({...specimen,id:`specimen-${i+1}`}));
  for(const step of ['introduce','open','sample','retract'])s=apply(s,{type:'BIOPSY',step,findingId:f.id,telemetry:view(f.region)});
  s=apply(s,{type:'BIOPSY',step:'label',site:f.region,label:'Gastric antrum final container'});
  assert.equal(s.specimens.length,100);assert.equal(s.biopsy.stage,'idle');
  assert.ok(restoreSession(s,config),'the boundary record must remain restorable');
  refuse(s,{type:'BIOPSY',step:'introduce',findingId:f.id,telemetry:view(f.region)});
  assert.equal(apply(s,{type:'END',telemetry:view('entry',{progress:0})}).phase,'recovery');
});

test('fragment limit leaves the final sample retractable and labelable',()=>{
  const f=findCase('gastric-ulcer').findings[0];
  let s=documentFinding(prepare('gastric-ulcer'),f);
  s.biopsy={stage:'retracted',findingId:f.id,sampleCount:99};
  for(const step of ['introduce','open','sample','retract'])s=apply(s,{type:'BIOPSY',step,findingId:f.id,telemetry:view(f.region)});
  assert.equal(s.biopsy.sampleCount,100);
  refuse(s,{type:'BIOPSY',step:'introduce',findingId:f.id,telemetry:view(f.region)});
  s=apply(s,{type:'BIOPSY',step:'label',site:f.region,label:'Gastric antrum full teaching container'});
  assert.equal(s.specimens[0].count,100);assert.equal(s.biopsy.stage,'idle');
  assert.ok(restoreSession(s,config));
});

test('documentation rejects incomplete telemetry and sampling requires a stable view',()=>{
  const f=findCase('gastric-ulcer').findings[0];
  const s=documentFinding(prepare('gastric-ulcer'),f);
  for(const missing of ['contact','retroflex']){
    const telemetry=view(f.region);delete telemetry[missing];
    refuse(s,{type:'PHOTO',telemetry});refuse(s,{type:'FINDING',id:f.id,telemetry});
  }
  refuse(s,{type:'BIOPSY',step:'introduce',findingId:f.id,telemetry:view(f.region,{dwell:0})});
});

test('restore validates specimen evidence, timing, and bounds interruption history',()=>{
  const f=findCase('gastric-ulcer').findings[0];
  const s=takeSamples(documentFinding(prepare('gastric-ulcer'),f),f,1);
  for(const corrupt of [{...s,findings:[]},{...s,photos:[]},{...s,elapsed:10,procedureSeconds:11}])assert.equal(restoreSession(corrupt,config),null);
  const pending={...s,events:Array.from({length:500},()=>({type:'previous',detail:'Previous learning action',at:1})),biopsy:{stage:'sampled',findingId:f.id,sampleCount:1}};
  const restored=restoreSession(pending,config);
  assert.ok(restored);assert.equal(restored.events.length,400);assert.equal(restored.events.at(-1).type,'interrupted-specimen');
  assert.ok(restoreSession(restored,config),'restoration must not produce a record that fails its next restore');
});
