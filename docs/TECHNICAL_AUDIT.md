# Endoscopy training architecture and limits

> Recovered planning/research snapshot from the earlier unpublished work. Statements about missing assets, planned architecture and media exclusion describe that baseline. For current implementation and remaining limits, see [the current plan](UPPER-GI-WORLD-PLAN.md), [clinical audit](CLINICAL-SOURCES.md), [published atlas rights](CLINICAL-MEDIA.md) and [release evidence](RELEASE-READINESS.md).


The existing upper-GI prototype is useful as an illustrative anatomy and rendering foundation. Its active runtime uses a prescribed GuidedTrack: insertion changes progress along a centreline, while gaze is independent. FlexibleScope is a separate numerical rod experiment and is not connected to the prototype interface.

The training suite should keep a single session state across theory, procedure practice and recovery. Room movement and instrument controls belong outside the organ renderer. An adapter should receive insertion, roll, two angulation commands and air/water/suction/lens-wash inputs, then expose pose, inspection evidence and rendering telemetry. Render the endoscopic scene to a texture for the procedure-room monitor.

## Reusable foundations

- Tissue shading, synthetic deformation, bounded fluid control state and endoscopic optics.
- Prepared indexed geometry, fetch deduplication and bounded mesh caching.
- Disease case definitions and synthetic morphology, as teaching illustrations.
- Guided tracks for demonstrations and optional assistance.
- Fixed-step flexible rod constraints and stable camera frames as an experimental manual-control foundation.

The monolithic prototype main module and its DOM-transforming disease interface should not own the new suite lifecycle. They lack teardown hooks and combine rendering, keyboard state, dialogs, case switching and demonstration playback.

## Material limitations

- Anatomy uses illustrative implicit volumes, not measured anatomy or a patient reconstruction. The entry begins in the oesophagus; mouth/pharynx and complete upper-GI anatomy are absent.
- Disease meshes alter visible surfaces, but the original dynamicField, fluid-contact query and FlexibleScope projection use the normal tissue field. A manual simulation must inject the active case field.
- Guided shaft radius is .032 scene units; the rod radius is .095. Units and dimensions are not calibrated. Do not report these values as measured diameter, depth, force or pressure.
- The original “look back” action changes gaze. It does not demonstrate mechanical retroflexion. The fundus guided stop does not prove a completed retroflexion maneuver.
- Gas, liquid and motility are visual approximations. Fluid state is not volume conserving; tissue compliance and motility are not pressure calibrated.
- Numerical contact and rod strain are simulation signals, not patient injury predictions or clinical risk estimates.
- Case appearances do not establish diagnosis, histology, disease grading or procedural competency.
- AI coaching based only on region/progress/gas/time cannot prove that the learner inspected a landmark or performed a maneuver. Explicit action and observation evidence is required.

## Reliability and accessibility findings

The original startup depends on prepared binaries, photograph textures and reference manifests; failed top-level loads can leave the application inert. WebGL context restoration, zero-size resize guards and explicit disposal are required for room transitions. Canvas keyboard focus, native dialogs and held-button keyboard support exist, but visual anatomy requires a meaningful text learning counterpart. Reduced-motion CSS affects transitions only, not physiological motion or tours.

The rod solver performs repeated all-pairs separation checks and creates temporary vectors during fixed-step constraints. Profile it on target devices before enabling full-length manual shaft physics. The original two-renderer layout should not become three independent WebGL contexts when adding a walkable room.

## Packaging

The training build includes only the new training application, explicitly listed reusable source modules, selected synthetic mesh cases and local Three.js/font dependencies. Clinical photographs, videos, PDFs, reference galleries, private files, repository metadata and prototype application pages are excluded. Add additional prepared mesh case IDs to training/mesh-cases.json; never add reference media merely to satisfy a missing texture.

`npm start` previews the training suite. `npm run build` creates dist; `npm run preview` serves that output. `npm run start:prototype` preserves the original prototype. The development server whitelists exposed source paths and generated case assets instead of exposing the repository root.

## Validation boundary

The baseline original checkout passed all 40 numerical tests, including geometry, collision, rod stability, cache behavior and guided-playback checks. This is useful implementation evidence; it does not validate clinical correctness, task completion or production browser reliability. New tests must cover session transitions, action evidence, accessible controls, asset failures and rendered manual interaction. Clinical review remains necessary before claiming realistic procedural instruction or competency assessment.
