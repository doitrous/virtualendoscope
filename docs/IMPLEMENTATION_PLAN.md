# Upper endoscopy training suite — implementation plan

> Recovered planning/research snapshot from the earlier unpublished work. Statements about missing assets, planned architecture and media exclusion describe that baseline. For current implementation and remaining limits, see [the current plan](UPPER-GI-WORLD-PLAN.md), [clinical audit](CLINICAL-SOURCES.md), [published atlas rights](CLINICAL-MEDIA.md) and [release evidence](RELEASE-READINESS.md).


Date: 13 October 2026. Baseline: `0e4505a3f08ea47477393fb171854de57e3814ec`. Branch: `codex/upper-endoscopy-training-world`.

## Product architecture

Build one coherent learning session across a connected theory room, diagnostic endoscopy procedure room and recovery area. Upper EGD is the first procedure; lower-GI indications and equipment are included in theory, while a lower-endoscopy procedure is a separate future milestone.

The source remains in the existing GitHub repository. A private GPT Site provides a reviewable browser deployment of the same training implementation. Preserve the original anatomy prototype at its existing path.

## Clinical foundation

Use current primary society guidance, with source-linked content and review dates. BSG/AUGIS 2026 upper-GI best practice, ESGE 2025 quality measures, BSG sedation guidance, individualized antithrombotic guidance, and infection-prevention standards inform the curriculum. Differences between guidance are identified rather than collapsed into a single universal rule. This is an educational simulation; content, anatomy and performance assessment require independent specialist validation before credentialing or clinical use.

Routine diagnostic endoscopy uses hand hygiene and appropriate PPE, not mandatory surgical scrubbing. Sedation is supervised and individualized; the simulator does not prescribe drug doses or declare a student clinically competent. No identifiable patient data is needed. Fictional patient scenarios are clearly labeled.

## Coordinated modules

1. **Content:** source registry, 16 theory lessons, case briefs, regional observations, preparation and recovery checkpoints.
2. **Session engine:** deterministic workflow, pre-procedure safety gates, photo/observation log, safe specimen workflow, scripted emergency drill, recovery and debrief. Persist only local training progress with schema versioning; export a session report.
3. **Suite renderer:** connected rooms, collidable architecture and furniture, navigation, room map, interactable stations, left-lateral simulation mannequin, endoscopy stack and recovery bed. Keyboard and on-screen alternatives, reduced motion, render quality and teardown.
4. **Endoscope runtime:** reuse prepared organ meshes and deterministic deformation; add direct tip angulation, roll, insertion/withdrawal, insufflation, irrigation, suction, lens wash, gastric retroflex view and image capture. The route-assisted teaching model must disclose its limits; it cannot claim calibrated haptic force or true flexible-shaft mechanics.
5. **Operator interface:** visible control-head interface, live video, landmark location, patient observations and real-time guidance. The same state drives controls, monitor and debrief.
6. **Build and validation:** self-hosted dependencies; no CDN dependency; selected assets only. Unit tests for safety/assessment transitions, existing numerical tests, build checks and browser interaction checks. Case generation is offline. Missing assets or WebGL errors produce recoverable messages.

## Visual and media strategy

Use generated reference imagery for art direction and a generic instrument illustration. Image-blaster was evaluated: its World Labs/FAL model-generation pipeline requires provider credentials; Blender was unavailable at initial inspection. Do not claim that those tools generated a 3D model when they did not. Geometry remains controllable and inspectable in Three.js. Generative images are not clinical ground truth.

The existing repository's clinical image rights are unverified. The new Site must not redistribute these images, video or PDFs. Clinical sources are linked; new tissue shaders use synthetic material. Retain original source assets in Git history without adding them to the Site build. Any later clinical-photo integration requires an explicit per-file license, attribution and review record.

## Acceptance checks

- Select disease before instrumentation; no case switching mid-procedure without starting a new session.
- Cannot start procedure until required preparation and patient-position checks are complete.
- User controls insertion/withdrawal, angulation, rotation and fluid functions from keyboard and visible controls.
- Endoscopic feedback reflects the current case, region, visibility and workflow state.
- Varix sampling is blocked; specimens require observation, safe capture and labeling.
- Photos and landmark observations are deliberate user actions, with visibility and region checks.
- End the procedure by withdrawing; recovery completion is gated and missing inspection is surfaced in debrief.
- Theory includes all requested topics and source links, with knowledge checks.
- Rooms are navigable; resize, input focus, held-input release and WebGL errors are handled.
- No claims of validated ultra-realistic anatomy, diagnostic accuracy, competence certification, multiplayer or clinical deployment readiness without evidence.

## Subsequent production validation

Independent endoscopist review, clinically validated anatomy/assets, input-device and haptic validation, prospective learning-outcome studies, device/browser performance matrix, authenticated instructor cohorts, server persistence, privacy/access controls, secure multiplayer/voice, and lower-GI procedural training are separate release gates. Do not substitute a polished browser demo for these gates.
