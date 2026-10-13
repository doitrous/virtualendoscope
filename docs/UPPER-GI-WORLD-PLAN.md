# Upper GI clinical world — implementation plan and recovery record

Date: 2026-10-13. Branch: `codex/upper-gi-clinical-world`.

## Plan-first record

This plan was written before new implementation work on this branch. Initial investigation identified the real-time Three.js laboratory at main commit `0e4505a`: prepared anatomy/disease meshes, twenty selectable views, synthetic tissue/optics/fluids, galleries and a resumable walkthrough. The remote training-world branch matched main. The experimental AI-proctor branch was not adopted as the feedback source.

The initial plan proposed embedding the laboratory behind a same-origin allowlisted bridge. Recovery then found earlier unpublished work with a more complete application: three rooms, curriculum, patient preparation, a directly imported renderer and recovery. The implementation adopted and repaired that recovered runtime. **The final architecture uses direct module imports, with no iframe or message bridge.** The bridge is a historical proposal, not an implemented dependency.

## Product and architecture now implemented

Three spaces connect theory → procedure → recovery. Room navigation and station controls complement 3D movement. One local session connects case briefing, preparation, endoscopic controls, region records, named photo labels, case-specific specimens, withdrawal, recovery and report export.

- `training/app.mjs` coordinates interface, rooms, scope, learning and session.
- `training/world.mjs` supplies room geometry and station interactions.
- `training/endoscope.mjs` imports shared anatomy, tissue, optics and mesh modules directly. Insertion follows a prescribed synthetic route; angulation and shaft rotation alter the view.
- `training/session.mjs` gates preparation, documentation, sampling and recovery, with bounded save/restore behavior.
- `training/content/` supplies 16 lessons, seven fictional cases and an attributed atlas. Sessions have 15 preparation and eight recovery checks.
- `scripts/build-training.mjs` packages selected meshes and local dependencies; the training server excludes legacy reference media.

The original laboratory remains under `prototypes/upper-gi-mesh`, served separately by `npm run start:prototype`. Its historical galleries remain available there; unverified clinical media is excluded from the training output.

## Work sequence

1. Verify society guidance first; retain dates, sampling-profile differences and clinical uncertainty.
2. Recover unpublished work, inspect contracts and select direct integration over the proposed bridge.
3. Repair safeguards: preparation before insertion, actual region/visibility evidence, specimen counts/site labels, withdrawal, paused restoration and recovery readiness.
4. Connect room geometry, lessons and the scope workspace; refine interaction, loading/error feedback, report export and responsive controls.
5. Generate labeled conceptual artwork; add only publication figures with recorded attribution permissions to the clinical atlas.
6. Package local dependencies and selected assets. Record automated and browser results separately from pending independent validation.

## Clinical decisions carried into the application

- Diagnostic EGD uses standard precautions and appropriate PPE; routine surgical scrub is not mandatory.
- Fasting, GLP-1 use, antithrombotics, diabetes medicines, tests and monitoring depend on the patient and procedure. No blanket cessation or drug-dose instructions.
- Consent, identity, allergies, readiness, left lateral positioning, rescue resources and time-out precede insertion.
- Photos, region records and counts log actions, without establishing inspection quality, measurement, diagnosis or specimen adequacy.
- Sampling is diagnosis-specific: ACG initial Barrett diagnostic profile, six feasible gastric-ulcer edge/base samples and BSG celiac four D2 plus two bulb samples in separate containers. Variceal biopsy is rejected; uncomplicated LA A/B and typical duodenal ulcers do not trigger routine sampling.
- Recovery uses baseline consciousness, respiration and patient-appropriate observations, with instructions, escort where applicable, warnings and pathology ownership; elapsed time alone does not authorize discharge.

[CLINICAL-SOURCES.md](CLINICAL-SOURCES.md) records guidance. [CLINICAL-MEDIA.md](CLINICAL-MEDIA.md) records atlas rights/limits; [VISUAL-PROVENANCE.md](VISUAL-PROVENANCE.md) records generated art.

## Acceptance criteria and verification record

Normal and pathological sessions should complete the journey. Missing preparation blocks insertion; off-region/unstable evidence cannot satisfy checkpoints; case changes cannot carry previous credit; unsafe sampling is rejected; controls stop on release or focus change; reload restores paused bounded state; sources and report remain available; the original laboratory stays usable.

Automated and browser verification is being completed separately. This plan does **not** assert every test or workflow has passed. Record concrete results in [RELEASE-READINESS.md](RELEASE-READINESS.md) and the delivery report.

## Release boundary

This is an upper GI educational vertical slice. Oral/pharyngeal intubation geometry, calibrated haptics/shaft mechanics, lower GI practical training, live instruction and clinical qualification assessment are absent. Independent expert review, student/user testing, accessibility and broad device/performance evaluation, and evidence of learning benefit remain pending. Appearance and software checks cannot establish clinical production readiness.
