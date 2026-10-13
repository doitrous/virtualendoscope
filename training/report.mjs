import { assess, REGION_NAMES } from './session.mjs';

const MAX_PHOTO_DATA_LENGTH = 2 * 1024 * 1024;
const MAX_EMBEDDED_PHOTO_LENGTH = 12 * 1024 * 1024;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const asArray = value => Array.isArray(value) ? value : [];
const objects = value => asArray(value).filter(item => item && typeof item === 'object');
const finiteSeconds = value => Number.isFinite(value) && value >= 0 ? value : 0;
const unique = value => [...new Set(asArray(value))];

function dateLabel(value) {
  if (value == null || !['number', 'string'].includes(typeof value)) return 'Not recorded';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC` : 'Not recorded';
}

function durationLabel(value) {
  const seconds = Math.floor(finiteSeconds(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${hours ? `${hours} hr ` : ''}${minutes} min ${remainder} sec`;
}

function safeLink(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function validPhoto(value) {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_DATA_LENGTH || !/^data:image\/jpeg;base64,/.test(value)) return false;
  const payload = value.slice('data:image/jpeg;base64,'.length);
  // Strict base64 and the JPEG start marker prevent a mislabeled HTML/SVG payload.
  return payload.length >= 8 && payload.length % 4 === 0 && /^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(payload);
}

function tag(text, complete, completeLabel = 'Completed', missingLabel = 'Missing') {
  return `<span class="status ${complete ? 'done' : 'missing'}">${escapeHTML(text || (complete ? completeLabel : missingLabel))}</span>`;
}

function empty(text) { return `<p class="empty">${escapeHTML(text)}</p>`; }
function paragraph(text, className = '') { return `<p${className ? ` class="${className}"` : ''}>${escapeHTML(text)}</p>`; }
function regionLabel(id) { return REGION_NAMES[id] || id || 'Site not recorded'; }

function checkTable(steps, recorded) {
  if (!steps.length) return empty('No checks are configured for this stage.');
  return `<table><thead><tr><th scope="col">Check</th><th scope="col">Session record</th></tr></thead><tbody>${steps.map(step => `<tr><td>${step.group ? `<small>${escapeHTML(step.group)}</small>` : ''}${escapeHTML(step.title || step.id)}</td><td>${tag('', recorded.includes(step.id))}</td></tr>`).join('')}</tbody></table>`;
}

const STYLES = `
:root{font-family:Figtree,Arial,sans-serif;color:#132c3b;background:#edf2f4;font-synthesis:none}*{box-sizing:border-box}body{margin:0;padding:36px 20px;font-size:14px;line-height:1.65}.report{max-width:960px;margin:auto;background:#fff;box-shadow:0 6px 35px #132c3b10}.masthead{padding:35px 46px 30px;background:#132c3b;color:#fff}.brand{margin:0 0 23px;color:#a6b8c1;font-size:11px;letter-spacing:.15em;text-transform:uppercase}.masthead h1{margin:0 0 9px;font-size:34px;font-weight:500;line-height:1.15;letter-spacing:-.03em}.masthead p{margin:0;color:#d2e0e7;font-size:13px}.report-status{display:inline-block;margin-top:20px;padding:5px 11px;border:1px solid #799aa6;border-radius:3px;color:#e4f1f4;font-size:11px}.content{padding:30px 46px 40px}.notice{margin-bottom:27px;padding:17px 20px;border-left:3px solid #247a72;background:#edf5f3;font-size:12px;color:#365c60}.notice strong{color:#132c3b}.notice p{margin:5px 0 0}.metadata{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:0 0 28px;padding-bottom:24px;border-bottom:1px solid #dce4e8}.metadata div{min-width:0}.metadata dt{color:#6a818d;font-size:10px;text-transform:uppercase;letter-spacing:.07em}.metadata dd{margin:4px 0 0;font-size:13px;overflow-wrap:anywhere}section{margin-top:33px}h2{margin:0 0 13px;font-size:21px;line-height:1.3;font-weight:550;letter-spacing:-.02em}h3{margin:0 0 8px;font-size:15px;font-weight:600}p{margin:0 0 12px;color:#405a68}.subtle{font-size:12px;color:#6b7f8a}.context-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 25px;margin:17px 0 0}.context-grid div{padding:11px 0;border-top:1px solid #e4eaed;min-width:0}.context-grid dt{font-size:10px;color:#6b7f8a;margin-bottom:4px}.context-grid dd{margin:0;font-size:13px;overflow-wrap:anywhere}.context-grid .full{grid-column:1/-1}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:20px 0}.summary-item{padding:14px;border:1px solid #dce4e8;border-radius:4px;background:#f7fafb}.summary-item strong{display:block;font-size:23px;font-weight:500;line-height:1.3;font-variant-numeric:tabular-nums}.summary-item span{display:block;color:#647d8a;font-size:10px;line-height:1.5;margin-top:7px}.status{display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;white-space:nowrap}.done{background:#e9f3ef;color:#256348}.missing{background:#f7eeea;color:#955c48}.neutral{background:#edf2f4;color:#516d7d}table{width:100%;border-collapse:collapse;font-size:12px;text-align:left}thead{background:#f2f6f8}th{padding:9px 11px;font-size:10px;font-weight:600;color:#526c7c}td{padding:10px 11px;border-bottom:1px solid #e2e9ed;vertical-align:top;overflow-wrap:anywhere}th:last-child,td:last-child{width:160px}td small{display:block;font-size:9px;color:#708590;margin-bottom:3px}.table-wrap{overflow-x:auto}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:25px}.two-col section{min-width:0}.two-col th:last-child,.two-col td:last-child{width:95px}.finding{padding:18px 0;border-bottom:1px solid #dce4e8;break-inside:avoid}.finding-head{display:flex;align-items:baseline;justify-content:space-between;gap:15px;margin-bottom:8px}.finding-head h3{margin:0}.finding-site{margin:0 0 12px;color:#6b7f8a;font-size:10px}.finding dl{margin:0}.finding dl div{margin-top:9px}.finding dt{font-size:10px;font-weight:600;color:#557482}.finding dd{margin:3px 0 0;font-size:12px;color:#405a68}.impression{padding:21px 23px;background:#f5f8fa;border:1px solid #dce4e8;border-radius:4px;white-space:pre-wrap;overflow-wrap:anywhere;color:#294857;font-size:13px}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:19px}figure{margin:0;break-inside:avoid;min-width:0}.photo-image{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:contain;background:#0d1e27;border:1px solid #dce4e8;border-radius:4px}.photo-placeholder{display:grid;place-items:center;min-height:170px;padding:25px;border:1px dashed #c1d0d8;border-radius:4px;background:#f4f7f9;color:#6a7f8c;text-align:center;font-size:12px}figcaption{padding-top:10px;font-size:12px;color:#294857}figcaption small{display:block;margin-top:3px;color:#738691;font-size:10px}.timeline{margin:0;padding:0;list-style:none}.timeline li{display:grid;grid-template-columns:155px minmax(0,1fr);gap:15px;padding:11px 0;border-bottom:1px solid #e4eaed;break-inside:avoid}.timeline time{color:#718693;font-size:10px}.timeline strong{display:block;font-size:12px;font-weight:600}.timeline p{margin:3px 0 0;font-size:12px;overflow-wrap:anywhere}.source-list{margin:0;padding-left:20px;font-size:12px}.source-list li{margin:0 0 13px;break-inside:avoid}.source-list a{color:#246f78;text-underline-offset:3px;overflow-wrap:anywhere}.source-list small{display:block;font-size:10px;color:#708590;margin-top:3px}.source-list .source-url{font-size:9px;color:#6b8390;overflow-wrap:anywhere}.empty{padding:15px 18px;border:1px dashed #cbd8df;border-radius:3px;font-size:12px;color:#6b7f8a}.footer{margin-top:35px;padding-top:21px;border-top:1px solid #dce4e8;font-size:10px;color:#728691;overflow-wrap:anywhere}.footer p{margin-bottom:6px;color:inherit;font-size:inherit}.limits{margin:0;padding-left:19px;font-size:12px;color:#405a68}.limits li{margin-bottom:6px}.print-note{margin:18px auto 0;max-width:960px;text-align:center;color:#6f8591;font-size:11px}@media(max-width:650px){body{padding:0}.report{box-shadow:none}.masthead{padding:28px 23px}.masthead h1{font-size:29px}.content{padding:24px 23px}.metadata{grid-template-columns:1fr 1fr}.context-grid,.two-col,.photo-grid{grid-template-columns:1fr}.summary{grid-template-columns:1fr 1fr}.timeline li{grid-template-columns:1fr;gap:4px}th:last-child,td:last-child{width:110px}.finding-head{align-items:flex-start}.print-note{padding:0 20px}}@page{size:A4;margin:16mm 15mm}@media print{:root{background:#fff}body{padding:0;font-size:11px}.report{max-width:none;box-shadow:none}.masthead{padding:0 0 18px;background:#fff;color:#132c3b;border-bottom:2px solid #132c3b}.brand{margin-bottom:13px;color:#527785}.masthead h1{font-size:27px}.masthead p{color:#405a68}.report-status{color:#315c63;border-color:#9bb6bd;margin-top:12px}.content{padding:20px 0 0}section{margin-top:24px}h2{font-size:18px;break-after:avoid}h3{break-after:avoid}.notice{font-size:10px}.metadata{font-size:10px;gap:10px}.metadata dd{font-size:11px}.summary-item strong{font-size:20px}table{font-size:10px}th,td{padding:7px 8px}thead{display:table-header-group}tr{break-inside:avoid}.two-col{display:block}.two-col section{break-inside:avoid}.photo-grid{grid-template-columns:1fr 1fr;gap:15px}.photo-placeholder{min-height:120px}.timeline li{grid-template-columns:140px minmax(0,1fr)}.source-list{font-size:10px}.impression{font-size:11px}.print-note{display:none}.footer{font-size:9px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

/** Produce a static, printable snapshot. No data is fetched and supplied state is not changed. */
export function buildReportHTML(session, config, photos = new Map(), sources = []) {
  if (!session || typeof session !== 'object') throw new TypeError('A session is required to build its report.');
  const cfg = {
    cases: objects(config?.cases).map(item => ({ ...item, findings: objects(item.findings) })), landmarks: objects(config?.landmarks),
    preparationSteps: objects(config?.preparationSteps), recoverySteps: objects(config?.recoverySteps),
  };
  const knownRegions = Object.keys(REGION_NAMES);
  const state = {
    ...session,
    observations: unique(session.observations).filter(id => knownRegions.includes(id)),
    preparation: unique(session.preparation), recovery: unique(session.recovery), findings: unique(session.findings),
    photos: objects(session.photos).slice(0, 50), specimens: objects(session.specimens), events: objects(session.events),
    procedureSeconds: finiteSeconds(session.procedureSeconds), elapsed: finiteSeconds(session.elapsed),
  };
  const assessment = assess(state, cfg);
  const caseItem = cfg.cases.find(item => item.id === state.caseId);
  const patient = caseItem?.patient || {};
  const findings = objects(caseItem?.findings);
  const photoLandmarks = cfg.landmarks.filter(item => item.photoRequired);
  const generationDate = new Date().toISOString();
  const complete = state.submitted === true && state.phase === 'debrief';
  const phase = String(state.phase || 'Not recorded').replaceAll('-', ' ');
  const status = complete ? 'Session completed · Educational debrief' : `Session in progress · ${phase}${state.paused ? ' · Paused' : ''}`;
  const prepCount = cfg.preparationSteps.filter(item => state.preparation.includes(item.id)).length;
  const recoveryCount = cfg.recoverySteps.filter(item => state.recovery.includes(item.id)).length;
  const labelCount = photoLandmarks.length - assessment.missingLandmarkPhotos.length;
  const row = (name, value, full = false) => `<div${full ? ' class="full"' : ''}><dt>${escapeHTML(name)}</dt><dd>${escapeHTML(value || 'Not supplied')}</dd></div>`;
  const context = [
    row('Training patient', patient.name), row('Age / sex', [patient.age, patient.sex].filter(value => value != null).join(' · ')),
    row('Indication', patient.indication, true), row('History', patient.history, true),
    row('Medications', asArray(patient.medications).join('; '), true), row('Allergies', patient.allergies),
    row('ASA teaching profile', patient.asa), row('Fasting plan', patient.fasting, true), row('Sedation plan', patient.sedationPlan, true),
  ].join('');
  const coverageRows = knownRegions.map(id => `<tr><td>${escapeHTML(REGION_NAMES[id])}</td><td>${tag('', state.observations.includes(id), 'Documented')}</td></tr>`).join('');
  const photoLabelRows = photoLandmarks.map(item => `<tr><td>${escapeHTML(item.title || item.id)}</td><td>${tag('', state.photos.some(photo => photo.landmarkId === item.id), 'Label recorded')}</td></tr>`).join('');
  const findingsHTML = findings.map(finding => {
    const sampleCount = state.specimens.filter(item => item.findingId === finding.id && item.region === finding.region).reduce((sum, item) => sum + (Number.isInteger(item.count) && item.count > 0 ? item.count : 0), 0);
    const sampling = finding.biopsy === 'required' ? `${sampleCount} of ${finding.sampleCount || 1} planned fragments logged` : finding.biopsy === 'optional' ? `${sampleCount} fragments logged · Optional sampling in this scenario` : finding.biopsy === 'avoid' ? 'Avoid biopsy in this scenario' : 'No routine biopsy indicated in this scenario';
    return `<article class="finding"><div class="finding-head"><h3>${escapeHTML(finding.title)}</h3>${tag('', state.findings.includes(finding.id), 'Recorded', 'Not recorded')}</div><p class="finding-site">${escapeHTML(regionLabel(finding.region))} · Clinical site: ${escapeHTML(finding.clinicalRegion || regionLabel(finding.region))}</p><dl><div><dt>Teaching appearance</dt><dd>${escapeHTML(finding.appearance)}</dd></div><div><dt>Interpretation to discuss</dt><dd>${escapeHTML(finding.interpretation)}</dd></div><div><dt>Scenario plan</dt><dd>${escapeHTML(finding.action)}</dd></div><div><dt>Sampling record</dt><dd>${escapeHTML(sampling)}</dd></div></dl></article>`;
  }).join('') || empty('No case findings are configured.');
  const specimensHTML = state.specimens.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Container / label</th><th scope="col">Site / finding</th><th scope="col">Fragments / time</th></tr></thead><tbody>${state.specimens.map(item => `<tr><td><small>${escapeHTML(item.id)}</small>${escapeHTML(item.label)}<small>Training patient: ${escapeHTML(item.patientId || patient.name)}</small></td><td>${escapeHTML(regionLabel(item.region))}<small>${escapeHTML(findings.find(finding => finding.id === item.findingId)?.title || item.findingId)}</small></td><td>${escapeHTML(Number.isInteger(item.count) && item.count > 0 ? item.count : 'Not recorded')}<small>${escapeHTML(dateLabel(item.at))}</small></td></tr>`).join('')}</tbody></table></div>` : empty('No labelled specimen containers were logged.');
  let embeddedLength = 0;
  const imagesHTML = state.photos.map(photo => {
    const value = photos instanceof Map ? photos.get(photo.id) : null;
    let image;
    if (validPhoto(value) && embeddedLength + value.length <= MAX_EMBEDDED_PHOTO_LENGTH) {
      embeddedLength += value.length;
      image = `<img class="photo-image" src="${escapeHTML(value)}" alt="Synthetic endoscopic session image: ${escapeHTML(regionLabel(photo.region))}">`;
    } else {
      image = `<div class="photo-placeholder">${value == null ? 'Image pixels are unavailable. The session retains this photograph’s label and time.' : 'Image omitted: unsupported image data or report size limit. The label and time remain available.'}</div>`;
    }
    const label = cfg.landmarks.find(item => item.id === photo.landmarkId)?.title || regionLabel(photo.region);
    return `<figure>${image}<figcaption>${escapeHTML(label)}<small>${escapeHTML(photo.id)} · ${escapeHTML(dateLabel(photo.at))} · ${photo.retroflex ? 'Retroflex view' : 'Forward view'}</small><small>Synthetic training image · Label requires expert review</small></figcaption></figure>`;
  }).join('');
  const events = state.events.map((item, index) => ({ item, index })).sort((left, right) => {
    const leftAt = Number.isFinite(left.item.at) ? left.item.at : Infinity;
    const rightAt = Number.isFinite(right.item.at) ? right.item.at : Infinity;
    return leftAt - rightAt || left.index - right.index;
  });
  const timelineHTML = events.length ? `<ol class="timeline">${events.map(({ item }) => `<li><time>${escapeHTML(dateLabel(item.at))}</time><div><strong>${escapeHTML(String(item.type || 'Event').replaceAll('-', ' '))}</strong><p>${escapeHTML(item.detail)}</p></div></li>`).join('')}</ol>` : empty('No events were logged in this session.');
  const seenSources = new Set();
  const sourceHTML = objects(sources).flatMap(source => {
    const url = safeLink(source.url);
    if (!url || seenSources.has(url)) return [];
    seenSources.add(url);
    return [`<li><a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title || 'Clinical source')}</a><small>${escapeHTML([source.organization, source.year].filter(Boolean).join(' · '))}</small><span class="source-url">${escapeHTML(url)}</span></li>`];
  }).join('');
  const pendingSampling = state.biopsy?.stage && state.biopsy.stage !== 'idle' ? `<div class="notice"><strong>Unfinished accessory workflow</strong>${paragraph(`The session was exported with the accessory workflow at “${state.biopsy.stage}”. Any unlabelled fragments are not credited as a completed specimen container.`)}</div>` : '';
  const activeDrill = state.emergency ? `<div class="notice"><strong>Safety drill remains active</strong>${paragraph(`Scripted scenario: ${state.emergency.type || 'Not recorded'}. Logged responses: ${asArray(state.emergency.actions).join(', ') || 'None'}.`)}</div>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="Lumen Endoscopy Training"><meta name="report-format" content="lumen-session-report-v1"><meta name="educational-only" content="true"><meta name="session-id" content="${escapeHTML(state.id)}"><meta name="generated-at" content="${escapeHTML(generationDate)}"><title>${escapeHTML(caseItem?.title || 'Endoscopy session')} · Educational session report</title><style>${STYLES}</style></head><body>
<main class="report"><header class="masthead"><p class="brand">Lumen / Endoscopy Academy</p><h1>Educational session report</h1><p>${escapeHTML(caseItem?.title || 'Case unavailable')} · Fictional patient · Synthetic examination</p><span class="report-status">${escapeHTML(status)}</span></header><div class="content">
<div class="notice"><strong>A record for reflection and supervised review.</strong><p>Completing simulator checks does not establish clinical competence, diagnostic accuracy or the adequacy of mucosal inspection. This report is not a clinical patient record or a certificate.</p></div>
<dl class="metadata">${row('Session ID', state.id)}${row('Started', dateLabel(state.startedAt))}${row('Report generated', dateLabel(generationDate))}${row('Session elapsed time', durationLabel(state.elapsed))}${row('Active procedure time', durationLabel(state.procedureSeconds))}${row('Learning mode', state.mode)}</dl>
<section><h2>Fictional case context</h2>${paragraph(caseItem?.description || 'The case context is unavailable in this report configuration.')}<dl class="context-grid">${context}</dl>${paragraph('All patient details are scenario assumptions. ASA status, preparation and sedation plans require clinical assessment in real practice.', 'subtle')}</section>
<section><h2>Session record at a glance</h2><div class="summary"><div class="summary-item"><strong>${prepCount} / ${cfg.preparationSteps.length}</strong><span>Preparation checks completed</span></div><div class="summary-item"><strong>${assessment.inspectedCount} / ${knownRegions.length}</strong><span>Simplified regions documented</span></div><div class="summary-item"><strong>${labelCount} / ${photoLandmarks.length}</strong><span>Required photo labels recorded</span></div><div class="summary-item"><strong>${recoveryCount} / ${cfg.recoverySteps.length}</strong><span>Recovery checks completed</span></div></div>${paragraph(assessment.qualityNote, 'subtle')}${paragraph(`Timing reference: ${assessment.timeNote}`, 'subtle')}</section>
${pendingSampling}${activeDrill}
<div class="two-col"><section><h2>Preparation checks</h2>${checkTable(cfg.preparationSteps, state.preparation)}${paragraph(`Position recorded: ${state.position === 'left-lateral' ? 'Left lateral' : state.position || 'Not recorded'}.`, 'subtle')}</section><section><h2>Recovery & handoff</h2>${checkTable(cfg.recoverySteps, state.recovery)}</section></div>
<div class="two-col"><section><h2>Regional observation record</h2><table><thead><tr><th scope="col">Simplified region</th><th scope="col">Status</th></tr></thead><tbody>${coverageRows}</tbody></table></section><section><h2>Required photo labels</h2>${photoLandmarks.length ? `<table><thead><tr><th scope="col">Landmark label</th><th scope="col">Status</th></tr></thead><tbody>${photoLabelRows}</tbody></table>` : empty('No required photograph labels are configured.')}</section></div>
${paragraph('A recorded region or photograph label reflects the learner’s action. An expert must verify the image, anatomical view and inspection quality.', 'subtle')}
<section><h2>Findings & scenario sampling plan</h2>${paragraph('Teaching appearances and interpretations are case context. Recording a finding does not confirm histology or establish a diagnosis.', 'subtle')}${findingsHTML}</section>
<section><h2>Labelled specimen record</h2>${specimensHTML}${paragraph('Logged fragment counts do not prove correct tissue acquisition, sampling distribution or histological adequacy. Labels and the follow-up plan require supervised review.', 'subtle')}</section>
<section><h2>Learner-written impression & follow-up</h2>${paragraph('The following text is the learner’s own entry and has not been clinically validated.', 'subtle')}${String(state.report || '').trim() ? `<div class="impression">${escapeHTML(state.report)}</div>` : empty('No impression or follow-up plan has been entered.')}</section>
<section><h2>Synthetic photograph record</h2>${paragraph(`${state.photos.length} captured photograph${state.photos.length === 1 ? '' : 's'}. Available JPEG pixels are embedded in this file; missing or unsupported pixels are represented by their recorded labels.`, 'subtle')}${imagesHTML ? `<div class="photo-grid">${imagesHTML}</div>` : empty('No photographs were captured.')}</section>
<section><h2>Chronological event log</h2>${timelineHTML}</section>
<section><h2>Clinical sources for the exercise</h2>${paragraph('These links point to the supplied teaching references. Apply their scope, publication date and current local guidance when discussing a real procedure.', 'subtle')}${sourceHTML ? `<ol class="source-list">${sourceHTML}</ol>` : empty('No valid web source links were supplied.')}</section>
<section><h2>Model & report limits</h2><ul class="limits"><li>Anatomy, tissue, images and patient details are synthetic teaching material.</li><li>Route-assisted insertion does not reproduce calibrated flexible-shaft mechanics, tissue forces or tactile feedback.</li><li>Coverage, timing, checklist completion and fragment counts are records for reflection; they do not establish clinical competence or inspection adequacy.</li><li>This static snapshot contains the supplied session record and available images. It does not update after export and sends no data.</li></ul></section>
<footer class="footer"><p>Generated status: ${escapeHTML(status)}</p><p>Generated ${escapeHTML(dateLabel(generationDate))} · Session ${escapeHTML(state.id)} · Report format lumen-session-report-v1 · Session data version ${escapeHTML(state.version ?? 'Not supplied')}</p><p>Lumen Endoscopy Training · Educational use only · Fictional patient</p></footer>
</div></main><p class="print-note">Open this file in a browser to read it, or use the browser’s Print command to save a PDF.</p></body></html>`;
}
