# Release readiness

Status date: **2026-10-13**. This records implemented scope and validation boundaries for the recovered suite. It does not assert all checks have passed or that the application is clinically production-ready.

## Implemented scope

| Area | Behavior | Limits |
| --- | --- | --- |
| Environment | Three explorable spaces and direct room/station access | Synthetic setting, not a validated facility |
| Content | 16 lessons, seven fictional cases, 15 preparation and eight recovery checks | Source-linked; independent clinical review pending |
| Integration | Direct runtime imports shared Three.js/mesh modules | No iframe bridge or external AI proctor |
| Examination | Route-assisted insertion, angulation, shaft-view rotation, retroflex teaching view and fluid/optics controls | No oral intubation geometry, calibrated resistance, looping or haptics |
| Safeguards | Preparation, position, region/visibility evidence, specimens, withdrawal and recovery gates | Logs simulation actions, not clinical competence |
| Sampling | Barrett, gastric ulcer and celiac counts/site labels; variceal biopsy rejection | Counts do not prove distribution or histological adequacy |
| Records | Local progress/images, HTML and JSON export | Single browser; no account sync or institutional patient workflow |
| Media | Attributed publication atlas, separately labeled generated art | Small/mixed or anatomically nonspecific panels do not validate synthetic cases |
| Packaging | Standalone build, local dependencies, selected meshes, restricted server | Deployment validation recorded separately |
| Original lab | Separate `npm run start:prototype` | Historical galleries have unresolved permissions; excluded from training output |

## Verification to record before delivery

Checked entries record actual development verification. Unchecked items remain incomplete; this is not independent release approval.

- [x] `npm test`, 2026-10-13: **83 passed, 0 failed, 0 skipped**. Includes the original 40 numerical checks and 43 training, build, storage, export and server checks.
- [x] Fresh standalone build: browser module imports, modal image URLs, all seven mesh pairs, atlas paths and exclusion of legacy media verified by the build contract test.
- [x] Gastric-ulcer workflow completed in the browser from preparation through six samples, withdrawal, eight recovery checks and debrief. Normal case controls, inspection and interrupted drill reviewed separately; a second complete normal browser run remains pending.
- [x] Held controls, keyboard operation after buttons, dialog/view input gates and paused reload reviewed. Final review found and fixed stale evidence after graphics loss; code review and regression tests confirm readiness gating and retained pending specimen state.
- [x] Corrupt and inconsistent saves rejected in regression tests; session-bound image hydration and new-case race guards tested. Captured JPEG was visibly restored after a browser reload.
- [ ] Keyboard, visible controls, narrow layouts, reduced motion and WebGL failure behavior reviewed.
- [x] Atlas source/attribution and license labels inspected in the browser; original files and checksums recorded in the media ledger. Synthetic session images remain separate.
- [ ] Original laboratory regression checked on its separate server.
- [x] Private Site deployment reported **succeeded** on 2026-10-13. Static root-path bundle packaged from Site source commit `1cf227ceb27c9c04dd98a113937443c5bdfeabc3`; native deployment verification returned a live URL. The existing owner-only audience was preserved.

## Independent validation still pending

- [ ] **Clinical expert review:** selection, preparation, guidance profiles, findings, sampling, recovery and learner wording.
- [ ] **Visual/anatomical review:** lesions, landmarks, orientation, retroflex teaching view and generated equipment ergonomics.
- [ ] **Student/instructor evaluation:** comprehension, usability, supervision expectations, feedback and error recovery.
- [ ] **Accessibility evaluation:** assistive technology, keyboard focus, reading order, contrast, motion and alternatives to 3D.
- [ ] **Performance/device evaluation:** representative hardware/browsers/mobile devices, loading, frame stability, memory and sustained sessions.
- [ ] **Learning assessment validation:** learning benefit, scoring reliability and transfer to supervised practice. Software gates do not qualify a clinician.
- [ ] **Deployment/security review:** host, local storage, request handling and future data features. No independent production security audit is claimed.

## Explicit boundaries

The path is synthetic and route-assisted. Oral/pharyngeal insertion is discussed in theory but is not geometrically simulated. Tissue, distension, clearance, fluids and optics are approximations. There is no calibrated force feedback, haptic hardware or validated shaft mechanics. Named photo labels record learner intent; the application cannot clinically verify what an image demonstrates.

Lower GI indications appear in theory, but no lower GI practical simulator exists. There is no real sedation administration, independent emergency treatment, live instructor, voice session, AI examiner, multiuser session or institutional integration. Advanced therapeutic procedures are outside the introductory practical scope.

The build ships an attributed atlas, excluding legacy GASTROLAB-attributed galleries. HyperKvasir's complete mixed figure supports appearance comparison; its ulcer panel has no verified antral/bulb site. Balaban figures use an Attribution notice with no specified version. Preserve these distinctions when describing coverage and rights.

## Evidence

- [Plan and recovery record](UPPER-GI-WORLD-PLAN.md)
- [Clinical audit](CLINICAL-SOURCES.md)
- [Atlas provenance and licenses](CLINICAL-MEDIA.md)
- [Generated visual provenance](VISUAL-PROVENANCE.md)
- [Third-party notices](../THIRD_PARTY_NOTICES.md)

An educational demonstration can be shared with these limitations stated. Broader clinical-production claims require the independent evidence above.

### Browser evidence so far

At `127.0.0.1:5194` in the Codex in-app browser: all 15 preparation gates were completed for the normal case; premature insertion was rejected; left lateral positioning was required. Held controls advanced the scope through oesophagus, junction, gastric body, retroflexed fundus, antrum, pylorus and duodenal bulb. Recorded checkpoints and labeled JPEGs updated the session. The scripted desaturation drill survived reload, disabled scope controls, rejected early resumption, and cleared only after all four team-response actions. Reload restored the examination paused and retained the actual captured image. Further full-workflow and responsive evidence is recorded below when complete.

### Completed gastric-ulcer browser workflow

At `localhost:5194`, 2026-10-13: **15/15 preparation, 8/8 examination regions, 10/10 required named photo labels, 6/6 sample fragments in a labeled antral container, full withdrawal, 8/8 recovery, report text and completed debrief**. Fragment counters advanced through 1, 2, 3, 4, 5 and 6. The debrief showed no outstanding sample targets. Browser console returned no errors after the latest-code reload. Desktop document width and viewport width were both 2056 pixels, with no horizontal overflow.

The illustrated-report download action produced its success notification. The browser automation did not expose a downloaded file path, so the filesystem receipt was not independently verified; report contents, JPEG bounds, source URLs and escaping passed automated tests. The mobile viewport override did not apply to the live test tab, so a real narrow-viewport browser pass remains pending.

A separate final code review found no remaining blocking phase, specimen or restoration issue after the graphics-failure fix. This development review is not clinical validation.


### Controls demo and realism follow-up — 2026-10-13

- Six-step orientation: introduction, up/down, left/right, shaft rotation, neutral controls, free practice. It runs before first insertion and is available from welcome/help/operator controls. A fixed normal-stomach model is separate from the chosen case; no insertion, fluids, procedure time, documentation or specimen credit is available during the demo.
- Generated gastric mucosa supplies restrained surface detail. Triplanar mapping, fine relief, varying roughness, two tip lights and deformation-corrected normals replace smooth generic tissue. Per-fragment Barrett/ulcer boundaries remove coarse vertex-color blocks. These improvements do not establish photographic or anatomical validation.
- Existing normal mesh was regenerated for comparison and found byte-for-byte current; no stale-asset change was needed. Runtime clones relax uniform body folds and terminate lower-cap convergence outward, with bounds of .11 body / .19 cap scene units. Tests retain winding, finite unit normals, disease protection and conservative collision clearance. The original laboratory assets remain unchanged.
- **111 automated tests passed** across the complete suite. After final normal smoothing, the 28 targeted geometry/demo/lifecycle tests and standalone build passed again. Browser console had no graphics errors in normal demo and gastric-ulcer examination views.
- Browser checks at **1280×720**: demo entry, animated up/down, full ±86° manual angulation, rotation and neutral reset; all 15 preparation checks; demo automatically before insertion; skip starts selected gastric-ulcer case at oesophageal entry. Reload during demo preserved 15/15 preparation and 0/8 observations. Replaying from gastric body restored route 44%, procedure time 00:27, zero credited observations and paused state. Exam continued into antrum (66%) with the refined ulcer visible.
- At **390×844**, the viewport override applied successfully. The document did not overflow horizontally (375 CSS-pixel document width within 390-pixel viewport including scrollbar), the demo footer stayed at viewport bottom, and the monitor remained visible during scroll. Reduced-motion demo opened paused, and manual controls remained available. Desktop sizing was restored afterward. This addresses the earlier single-device mobile-check gap, not broad device qualification.
- Graphics-context loss during a pending mesh load now keeps Retry available and preserves the case checkpoint. Paused-demo retry retains the selected pose. Behavioral regression tests fail when either correction is removed.

The room patient remains an illustrative mannequin. Route/force/anatomical limitations and independent clinical validation requirements above still apply; this update does not represent a fully photorealistic patient or a certified clinical simulator.

Final hosted follow-up: the tablet-width session rail was hidden in the scope workspace and the demo monitor enlarged at intermediate widths. The deployed app was checked at 989×1194: rail absent, monitor starts at 76px with 550px height, document width 974px, normal stomach loaded. Final private deployment succeeded at `https://lumen-endoscopy-training.qwnm7qv7pr.chatgpt.site` from static Site commit `76029045dc8cc955b184ee26d25b6315b65d4af5` (saved version `appgprj_6acd99bc842c819191fb290565090fc0~appgver_ae752335ba9481919cff760612d9d83b`). Authoring implementation commits: `ad9614b` and `ffaeb44`; draft PR #2 remains open.
