# Flexible scope and video-guided regional update

## Stability and appearance repair

Steering now uses a fixed command frame. Previously, recalculating a held bend against the rod's changing proximal tangent could recirculate shaft motion into new steering. Camera orientation now uses parallel transport and a bounded angular rate instead of a world-up lookAt frame, eliminating its pole-crossing flips. C rebases neutral steering to the current viewing frame. Esc pauses; Resume restores the session. Opening and closing references preserves a user-requested pause, and controls are disabled during initial loading.

The Watch peristalsis button selects the antrum and starts near the contraction onset; it does not pretend that a physiological cycle lasts only a few seconds. The repeated waveform remains an interpreted approximation. Rounded lower-amplitude rugae, fading near the polar axis, replace sharp pinched spokes. A finer mesh, reduced baked-photo contrast and broader specular highlights reduce faceting and repeated dark creases. These are rendering improvements, not a claim of photographic equivalence.

The interface uses a warm coffee palette with cream surfaces, restrained borders, Figtree text and rose `#d13a63` actions. The optical field remains black-framed.

## What is simulated

- A finite-radius visible shaft and its centreline, anchored at an oesophageal entry guide.
- Inserted arc length, damped nodal motion, near-inextensible segment constraints and passive bending resistance.
- A controllable distal bending section. The camera follows its actual terminal tangent, not an independent free-camera direction.
- Fixed 60 Hz integration, up to 14 constraint sweeps, shaft-node and midpoint wall projection, non-neighbour node self-separation, and insertion resistance when excessive constraint strain remains.
- Pushing can bend the shaft instead of translating the camera through a wall. Withdrawal removes inserted length. R commands a backward bend; C releases angulation. The Fundus preset seeds a backward-looking shaft configuration.
- Circular aperture preserved across panel aspect ratios, radial distortion, two tip-mounted lights, peripheral falloff, tone mapping and temporally smoothed exposure. Exposure meters rendered scene luminance at low resolution rather than using distance alone.

## Important limits

This is a position-based rod approximation with kinematic distal actuation, not a calibrated Cosserat-rod/finite-element model. It uses dimensionless model units, numerical stiffness and contact damping—not measured device Young's modulus, force, friction or torsional rigidity. Q/E prescribes distal rotation; shaft torque propagation is not solved. Contacts do not predict trauma, pain or perforation. Tissue response is prescribed motion, not a two-way biomechanical material model. Self-contact is node based, not exact continuous capsule–capsule collision. Constraint strain can remain at tight bends; contact is prioritised, and excessive insertion is resisted. There is no hardware haptic force output.

## New source intake

`prepare-videos.mjs` reads the supplied folder without changing originals. Twelve MKV filenames represent eleven unique clips; **Normal Esophagus** and **Normal esophagus peristalsis** have identical SHA-256 hashes. Browser-playable silent MP4s, sampled contact sheets, exact original titles, frame rates, dimensions, durations, hashes and duplicate links are stored under `references/videos/`. Contact-sheet times are approximate evenly spaced review positions, not frame-accurate event labels. No media was uploaded externally.

`video-observations.mjs` contains the reviewed interpretation for every title and drives the in-app selector. Gastric contraction was additionally inspected at one-second intervals between 7 and 21 seconds in the antral-wave clip. Periodic model repetition and spatial propagation were selected for a controllable prototype; they are not quantitatively fitted to measured anatomy or instrument signals.

## Regional changes

| Clips | Observed features | Implemented interpretation |
|---|---|---|
| Normal oesophagus; Oesophagus AND cardia | Asymmetric/triangular lumen, longitudinal folds, convergence into a slit/star | Three-lobed irregular oesophageal folds and retained contraction/reopening envelope |
| Gastric body / GASTRIC MUCOSA LOOK | Irregular raised rugae, wet reflections, secretions and near-wall exposure change | Stronger nonuniform gastric fold relief; actual scene exposure metering |
| Both U-shaped/retroflexed titles | Scope shaft visible in backward-looking inspection | 3D flexible shaft, distal bending section/ring, Fundus retroflex preset |
| Antrum and pylorus; Peristaltic Wave | Travelling circumferential narrowing and a separately puckering pylorus | Regional antral-wave deformation plus distinct pyloric cycle; collision uses the same composed deformation as rendering |
| Pylorus, bulb and descending duodenum | Transition from relatively smooth bulb to transverse folds | Stronger transverse outlet folds and an added descending-duodenum inspection position |
| Normal Larynx / Normal larynx 2 | Changing glottic opening and surrounding laryngeal anatomy | Reference player only; no fabricated laryngeal mesh or airway route |

No title or clip provides reliable air-button or suction telemetry. Apparent expansion can combine camera translation, muscle activity and gas; no automatic withdrawal-equals-collapse rule was added. Passive gas loss was slowed so the stomach does not automatically deflate within approximately half a minute. Exact insufflation/compliance still requires labelled events or expert review.

The anatomy remains illustrative, capped at both navigation boundaries. The current model is not a patient reconstruction or a validated clinical training product.

## Verification

Run `node --test prototypes/upper-gi-mesh/anatomy.test.mjs prototypes/upper-gi-mesh/tissue.test.mjs prototypes/upper-gi-mesh/scope-physics.test.mjs` from the workspace. Browser rendering must additionally be checked. The local preview remains `node prototypes/upper-gi-mesh/preview.mjs`, port 5194.
