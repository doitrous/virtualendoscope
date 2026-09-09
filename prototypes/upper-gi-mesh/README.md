# Lumen — reference-guided endoscopy study

The simulator uses the warm/coffee theme tokens from `src/index.css`, without a logo or brand name. Disease rows include separate real-photo buttons; galleries contain supplied photographs, condition references, and contributor-attributed GASTROLAB credit. Individual authorship and reuse permissions remain unverified.

## Resumable 53-second walkthrough

The showcase preloads its cases, then shows three seconds of stationary normal oesophageal peristalsis before varices → LA B → LA D and the gastric/duodenal sequence. Cancer, oesophageal Crohn's, standalone hernia and less conspicuous findings are omitted from the walkthrough, not the case library. Hernia with gastric polyps and the separate gastric-polyps segment remain. Papilla/ampulla is absent from selectable cases. Cases are teaching alternatives, not one patient's disease progression.

Distension is 0.7 during the tour. Monotone interpolation smooths travel speed between segments; the camera follows the route without oscillating between nearby lesions. Captions appear top-center. Stop, manual interaction, photos and backgrounding pause the tour; Resume restores its saved position, gaze, distension and case without reloading. The pinned cache remains while paused and is released on completion. Low frame rates lengthen playback rather than cause catch-up jumps. Automated tests cover schedule, continuity, pause/resume, completion and loading cancellation.

## Responsive runtime

All 26 distinct cases/combinations are prepared offline with `node prototypes/upper-gi-mesh/prepare-mesh-assets.mjs`. Run this again after editing anatomical geometry, disease morphology, case combinations or the binary format. Commit/deploy `assets/meshes/manifest.json` and its referenced content-hashed binary assets together. The browser no longer runs marching tetrahedra or vertex-colour generation. Vertex deduplication reduces the normal mesh from 328,236 repeated vertices to 54,703 indexed vertices; its packed main asset is about 3.5 MB. The complete on-disk library is about 102.5 MB, not downloaded upfront.

Startup loads the normal case and warms its tissue shader. A bounded four-case in-memory cache, hover/focus prefetch and HTTP cache reuse accelerate subsequent selections. Rapid selections use latest-request-wins and never disable the disease buttons. Reference galleries are prepared only when opened. Rendering now targets 60 FPS with adaptive resolution; the overview remains capped at 10 FPS. No catch-up movement is introduced.

Local measurements: original preparation took roughly 3–6 seconds per case; loading already-read binary data into geometry took about 1–8 ms in Node (not an end-to-end browser interaction measurement). Browser smoke checks reported 48 FPS and confirmed rapid varices → inlet patch → LA D selection left LA D active. Formal DevTools tracing was unavailable, so no Lighthouse or Core Web Vitals score is claimed. Test the asset format, coverage, retry behaviour, cache bounds and absence of runtime rebuilds with `node --test prototypes/upper-gi-mesh/mesh-assets.test.mjs`.

## Current UI and disease library

The default page now uses a compact atlas interface: Case library, View finding, Case details, Region, scope functions and Continue/Stop. Shortcuts and Settings open dialogs. Decorative dots and repeated descriptions are removed. Twenty-three supplied disease folders map to 21 choices (including normal anatomy and normal papilla). Disease changes preserve insertion position and insufflation, while View finding explicitly jumps and looks toward the finding. Optional companions are opt-in and sourced; reflux does not automatically add gastritis. Every case retains guided traversal.

See `DISEASE-RESEARCH.md` for source-by-source research, downloaded references and important approximation limits. Geometry and coloration are synthetic and not a validated diagnostic trainer. Run `node --test prototypes/upper-gi-mesh/disease.test.mjs prototypes/upper-gi-mesh/guided-track.test.mjs prototypes/upper-gi-mesh/tissue.test.mjs` for the active-mode checks. Older sections below are historical development notes.

## Current default: simple guided mode

Update: the lumen starts at zero insufflation with a flattened, narrow slit. Hold I (or the Insufflate button) to open it progressively; K narrows it again. Distension is illustrative, not pressure-calibrated. A persistent depth-tested 3D shaft follows the inserted route and appears when looking back toward it; gaze does not move the shaft. It ends behind the optical face, with no floating overlay. Steady (.45 model units/s) is now default, with Slow (.25) and Brisk (.65). The framebuffer automatically reduces resolution under sustained slow frames, and dry-lens frames skip droplet/blur sampling. Tests cover the complete shaft surface against the moving, collapsed cavity.

The user requested replacing free scope control with one prescribed track. The active view now starts stopped and follows an arc-length-parameterised route from oesophagus through stomach to descending duodenum. Continue/Stop (or Space) controls travel. Mouse drag and A/D or left/right look independently; T/G look vertically; C centres the view. W/up and S/down provide held forward/back travel; releasing stops manual travel. Slow is the default, with Very slow and Steady options. Region jumps always stop. Esc stops travel while allowing inspection and visible peristalsis.

The old rod solver is retained for development but is **not imported or run** by the active page. No live shaft physics or free insertion simulation is claimed in this mode. Rendering targets 30 FPS, with a pixel budget and a lower-detail overview updated at 10 FPS. Scene readback for exposure is replaced by lightweight proximity-based adaptation. Long frames are discarded rather than caught up as sudden movement. Motility does not move the stopped camera, and passive gas drift is disabled in this learning mode.

Guided regression tests: `node --test prototypes/upper-gi-mesh/guided-track.test.mjs`. The earlier mechanics and historical controls below describe the retained experimental version, not the current navigation mode.

Run `node prototypes/upper-gi-mesh/preview.mjs` from the workspace. Open `http://127.0.0.1:5194/prototypes/upper-gi-mesh/index.html`. This is an isolated local prototype, not a deployed route in the production application. The small preview server serves only this prototype and its public Three.js/font dependencies; no remote services or patient uploads are used.

Included: connected illustrative upper-GI cavity; regional tissue materials and raised folds; a visible flexible scope with constrained centreline, distal angulation, insertion/withdrawal and finite-radius contact; circular optics, radial distortion, tip lighting and scene-metered exposure; oesophageal, antral and pyloric motion; gas, suction, irrigation and approximate fluid effects. Eight inspection positions and a synchronously deforming cutaway with the actual shaft centreline aid navigation. Read `PHYSICS-AND-VIDEO-NOTES.md` for the current mechanics, video interpretation and limitations.

Controls: W or ↑ advance, S or ↓ withdraw; A/D or ←/→ horizontal tip angulation; drag for free tip angulation; T/G vertical angulation; Q/E rotate; Shift slow movement. Hold I insufflation, J irrigation, K suction, L lens wash. Corresponding on-screen buttons also support pointer hold and keyboard Space/Enter hold. Escape releases controls. Functions stop on loss of focus. These are keyboard abstractions, not clinical endoscope controls.

The organ is generated from smooth implicit anatomical volumes, not a tube centreline. It is not reconstructed from clinical images and has no expert anatomical approval. Exact proportions, the incisura, junction geometry and patient variation need review. The scope now has an articulated centreline, but retroflexion is not mechanically validated. R commands a backward bend; C releases angulation. Terminal inlet/outlet extensions remain capped.

## Supplied references and implementation limits

The source directory resolved to `C:\Users\Omar_\OneDrive\Desktop\Gastroenterology sim`. Its 32 JPGs and one MKV were copied unchanged to `references/`. All JPGs are accessible through the in-app comparison gallery. Four inspected tissue-only patches (oesophagus, body, pyloric/antral lining, bulb) feed runtime colour textures; the other views guide fold/junction appearance and are retained for comparison. No photogrammetry, neural reconstruction or anatomically exact interpolation between unrelated frames is claimed. Texture crops compress baked illumination but are not true measured albedo.

The initial peristalsis video is retained under `references/motion/`. The new twelve titled video files (eleven unique clips) have been reviewed through sampled frames and converted locally into browser copies under `references/videos/`. The in-app video selector preserves original titles and explains each interpretation. Propagation delay, scale, gas response and breathing are adjustable code parameters, **not measured physiology**; camera motion confounds tissue motion. No reliable air/suction telemetry is supplied. Do not mechanically couple withdrawal to collapse. Laryngeal clips remain reference-only.

The requested layers have **prototype** implementations, not a completed hyperrealistic or clinically validated simulator. Gastric fold flattening is not independently calibrated; gas and muscle activity apply regional deformations. Fluid effects are visual approximations, not volume-conserving CFD. Scope mechanics use a position-based elastic-rod approximation with prescribed distal actuation, not measured force or torque. No haptics, tissue injury prediction, diagnostic/scoring system or complete duodenal anatomy is provided. `stomach-checkpoint.glb` remains the original undeformed mesh export, not the animated organ/scope scene.

References are kept local. Their original authorship/reuse rights have not been verified; do not publish the clinical media or redistribute the package before checking permissions and de-identification.

Verification: `node --test prototypes/upper-gi-mesh/anatomy.test.mjs prototypes/upper-gi-mesh/tissue.test.mjs prototypes/upper-gi-mesh/scope-physics.test.mjs`. Tests cover connectivity, finite mesh data, moving cavity clearance, deformation/collision agreement, regional contraction, bounded fluids, shaft presets, insertion/withdrawal, constrained bending and fixed-step agreement. Shader rendering must additionally be checked in a real browser.

Browser verification so far: Codex in-app Chromium only. The dependency-free preview uses WebGL, ES modules, import maps and native dialog: current desktop Chrome/Edge/Firefox/Safari are targets, not verified cross-browser passes. No WebGPU requirement. Low/Balanced/High adjust render resolution. Performance numbers describe the current machine only. Import-map support sets a newer browser floor than WebGL alone.

Earlier public reference metadata/provenance work is retained under `docs/upper-gi-simulation`; it is separate from the supplied local media used here.
