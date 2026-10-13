import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportHTML } from './report.mjs';
import { createSession, REGIONS } from './session.mjs';
import { cases, landmarks, sources } from './content/cases.mjs';
import { preparationSteps, recoverySteps } from './content/curriculum.mjs';

const config = { cases, landmarks, preparationSteps, recoverySteps };
const tinyJPEG = 'data:image/jpeg;base64,/9j/2Q==';
function sampleSession() {
  const session = createSession('gastric-ulcer', 'guided', Date.UTC(2026, 9, 13, 9));
  Object.assign(session, {
    phase: 'recovery', elapsed: 900, procedureSeconds: 430,
    preparation: [preparationSteps[0].id], recovery: [recoverySteps[0].id],
    observations: ['entry', 'antrum'], findings: ['antral-ulcer'],
    photos: [{ id: 'photo-1', landmarkId: 'antrum', region: 'antrum', at: session.startedAt + 1000, retroflex: false }],
    specimens: [{ id: 'specimen-1', findingId: 'antral-ulcer', region: 'antrum', label: 'Antrum — ulcer edge', count: 2, patientId: 'Training Patient 04', at: session.startedAt + 2000 }],
    report: 'Antral lesion documented. Histology review assigned to the supervising team.',
    events: [{ type: 'specimen', detail: 'Later event', at: session.startedAt + 2000 }, { type: 'photo', detail: 'Earlier event', at: session.startedAt + 1000 }],
  });
  return session;
}

test('report contains case context, missing checks, coverage, sampling, impressions and chronological records', () => {
  const session = sampleSession();
  const before = structuredClone(session);
  const configBefore = structuredClone(config);
  const html = buildReportHTML(session, config, new Map([['photo-1', tinyJPEG]]), sources);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /Fictional case context/);
  assert.match(html, /Training Patient 04/);
  assert.match(html, /2026-10-13 09:00:00 UTC/);
  assert.match(html, /15 min 00 sec/);
  assert.match(html, /7 min 10 sec/);
  assert.match(html, /2 \/ 8/);
  assert.match(html, /1 \/ 10/);
  assert.match(html, /class="status done">Completed/);
  assert.match(html, /class="status missing">Missing/);
  assert.match(html, /class="status done">Label recorded/);
  assert.match(html, /2 of 6 planned fragments logged/);
  assert.match(html, /Antrum — ulcer edge/);
  assert.match(html, /Histology review assigned to the supervising team/);
  assert.ok(html.indexOf('Earlier event') < html.indexOf('Later event'));
  assert.match(html, /<img class="photo-image" src="data:image\/jpeg;base64,/);
  assert.match(html, /name="session-id" content="lumen-/);
  assert.match(html, /name="report-format" content="lumen-session-report-v1"/);
  assert.match(html, /Generated status: Session in progress · recovery/);
  assert.match(html, /@media print/);
  assert.doesNotMatch(html, /<script\b|<iframe\b|<link\b|@import|onload=/i);
  assert.deepEqual(session, before, 'report generation must not reorder or mutate the session');
  assert.deepEqual(config, configBefore, 'case configuration must stay unchanged');
});

test('all untrusted text and attributes remain escaped, including patient context and clinical references', () => {
  const attack = '<script>alert("x")</script><img src=x onerror="attack"> & \'quoted\'';
  const session = sampleSession();
  session.id = attack;
  session.mode = attack;
  session.report = attack;
  session.events[0].type = attack;
  session.events[0].detail = attack;
  session.specimens[0].label = attack;
  const caseItem = structuredClone(cases.find(item => item.id === session.caseId));
  caseItem.title = attack;
  caseItem.description = attack;
  caseItem.patient.name = attack;
  caseItem.patient.medications = [attack];
  caseItem.findings[0].appearance = attack;
  const html = buildReportHTML(session, { ...config, cases: [caseItem] }, new Map(), [{ title: attack, organization: attack, year: attack, url: 'https://example.com/guidance?q="test"&topic=egd' }]);
  assert.doesNotMatch(html, /<script\b|<img\b|<iframe\b/i);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /&amp; &#39;quoted&#39;/);
  assert.match(html, /name="session-id" content="&lt;script/);
  assert.match(html, /href="https:\/\/example.com\/guidance\?q=%22test%22&amp;topic=egd"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
});

test('source URLs allow only HTTP(S) and valid links are deduplicated', () => {
  const supplied = [
    { title: 'JS', url: 'javascript:alert(1)' },
    { title: 'Data', url: 'data:text/html,<script>alert(1)</script>' },
    { title: 'Local', url: 'file:///etc/passwd' },
    { title: 'Relative', url: '/local' },
    { title: 'Malformed', url: 'not a url' },
    { title: 'HTTP', url: 'http://example.com/guidance' },
    { title: 'Duplicate', url: 'http://example.com/guidance' },
    { title: 'HTTPS', url: 'https://example.com/guidance' },
  ];
  const html = buildReportHTML(sampleSession(), config, new Map(), supplied);
  assert.equal((html.match(/<a href=/g) || []).length, 2);
  assert.doesNotMatch(html, /javascript:|data:text|file:\/\/|href="\/local"/);
});

test('only bounded, strict JPEG data from the supplied Map is embedded', () => {
  const session = sampleSession();
  const invalidPixels = [
    'https://example.com/patient-image.jpg',
    'data:image/png;base64,/9j/2Q==',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/jpeg;base64,PHNjcmlwdD4=',
    'data:image/jpeg;base64,/9j/2Q==" onerror="attack',
    'data:image/jpeg;base64,/9j/2Q==\n',
    'data:image/jpeg;base64,/9j/2Q=',
    `data:image/jpeg;base64,/9j/${'A'.repeat(2 * 1024 * 1024)}`,
    { toString: () => tinyJPEG },
  ];
  for (const value of invalidPixels) {
    const html = buildReportHTML(session, config, new Map([['photo-1', value]]));
    assert.doesNotMatch(html, /<img\b/);
    assert.match(html, /Image omitted: unsupported image data or report size limit/);
    assert.match(html, /photo-1/);
  }
  const unavailable = buildReportHTML(session, config, new Map([['different-photo', tinyJPEG]]));
  assert.doesNotMatch(unavailable, /<img\b/);
  assert.match(unavailable, /Image pixels are unavailable/);
  const objectInsteadOfMap = buildReportHTML(session, config, { 'photo-1': tinyJPEG });
  assert.doesNotMatch(objectInsteadOfMap, /<img\b/);
  const valid = buildReportHTML(session, config, new Map([['photo-1', tinyJPEG]]));
  assert.match(valid, /<img\b/);
});

test('total embedded photo size is bounded while all recorded labels remain visible', () => {
  const session = sampleSession();
  const pixels = `data:image/jpeg;base64,/9j/${'A'.repeat(2 * 1024 * 1024 - 40)}`;
  assert.equal((pixels.length - 'data:image/jpeg;base64,'.length) % 4, 0);
  session.photos = Array.from({ length: 8 }, (_, index) => ({ id: `photo-${index + 1}`, region: 'antrum', at: session.startedAt + index }));
  const html = buildReportHTML(session, config, new Map(session.photos.map(photo => [photo.id, pixels])));
  assert.equal((html.match(/<img class="photo-image"/g) || []).length, 6);
  assert.equal((html.match(/<figure>/g) || []).length, 8);
  assert.match(html, /report size limit/);
  assert.match(html, /photo-8/);
});

test('session completion is stated only for a submitted debrief and never implies competence', () => {
  const session = sampleSession();
  session.phase = 'debrief';
  session.submitted = true;
  session.observations = [...REGIONS, 'entry'];
  const html = buildReportHTML(session, config);
  assert.match(html, /Generated status: Session completed · Educational debrief/);
  assert.match(html, /8 \/ 8/);
  assert.match(html, /Completing simulator checks does not establish clinical competence/);
  assert.match(html, /adequate mucosal inspection still requires expert assessment/);
  assert.match(html, /not a clinical patient record or a certificate/);
  session.submitted = false;
  session.procedureSeconds = 120;
  const incomplete = buildReportHTML(session, config);
  assert.match(incomplete, /Generated status: Session in progress/);
  assert.match(incomplete, /Duration alone does not establish adequate inspection/);
});

test('empty records are explicit and unfinished instrument or safety workflows are preserved', () => {
  const session = createSession('normal-egd', 'guided', 0);
  session.biopsy = { stage: 'sampled', sampleCount: 1, findingId: 'unknown' };
  session.emergency = { type: 'hypoxia', actions: ['stop', 'help'] };
  const html = buildReportHTML(session, config);
  assert.match(html, /No impression or follow-up plan has been entered/);
  assert.match(html, /No labelled specimen containers were logged/);
  assert.match(html, /No photographs were captured/);
  assert.match(html, /No events were logged/);
  assert.match(html, /Unfinished accessory workflow/);
  assert.match(html, /Safety drill remains active/);
  assert.match(html, /not credited as a completed specimen container/);
  assert.match(html, /1970-01-01 00:00:00 UTC/);
});
