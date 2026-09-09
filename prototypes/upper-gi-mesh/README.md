# Upper-GI simulator implementation

This directory contains the runtime, offline mesh-preparation tools, reference manifests and automated checks for Virtual Endoscope.

## Runtime design

The simulator uses a prescribed centreline from the oesophagus through the stomach and into the descending duodenum. Students control progress independently from viewing direction. The visible shaft follows the inserted route; gaze movement does not move it.

The lumen begins largely collapsed and opens progressively with insufflation. Suction, irrigation, lens wash, exposure adaptation and fluids are visual teaching approximations rather than calibrated pressure, flow or CFD models. Oesophageal and antral deformation is based on qualitative interpretation of supplied videos, not measured force or propagation data.

An indexed binary mesh is prepared for each disease configuration. Runtime selection fetches only the requested asset, uses latest-request-wins for rapid changes, and retains a bounded four-case cache. Rendering targets 60 FPS with adaptive resolution; the overview is capped at 10 FPS.

## Disease library

The selector contains normal anatomy plus 19 disease views. Optional related findings must be enabled explicitly; association does not imply that two conditions always coexist. Disease morphology and colour are synthetic illustrations informed by supplied images and the sources in [`DISEASE-RESEARCH.md`](DISEASE-RESEARCH.md).

The 53-second walkthrough begins with three seconds of stationary normal oesophageal peristalsis, then advances through a curated proximal-to-distal selection. It omits subtle findings, oesophageal cancer, oesophageal Crohn's disease and standalone hiatal hernia. Pausing for manual interaction or a photo gallery preserves elapsed time, route position, gaze, distension and the prepared tour cache.

## Development

From the repository root:

```sh
npm ci
npm start
npm test
```

Rebuild all prepared disease meshes after changing anatomy, disease morphology, case combinations or the binary format:

```sh
node prototypes/upper-gi-mesh/prepare-mesh-assets.mjs
```

Commit `assets/meshes/manifest.json` and every referenced content-hashed binary together. The complete prepared mesh library is roughly 100 MB, but it is not downloaded upfront.

Reference-import tools accept a source directory instead of assuming a developer-specific path:

```sh
node prototypes/upper-gi-mesh/prepare-diseases.mjs "/path/to/disease-folders"
node prototypes/upper-gi-mesh/prepare-videos.mjs "/path/to/video-files" --encode
```

`prepare-videos.mjs` requires `ffmpeg` and `ffprobe` on `PATH`, or `FFMPEG_DIR` pointing to their directory. Import scripts copy files and regenerate manifests; review licensing, privacy and the resulting diff before committing media.

## Validation boundaries

- Anatomy is generated from illustrative implicit volumes, not patient imaging or a measured specimen.
- Disease views are not validated for diagnosis, grading or competency assessment.
- Scope motion is not a measured force/torque or haptic model.
- Distension is not pressure calibrated and fluids are not volume conserving.
- The duodenum is incomplete and retroflexion is not mechanically validated.
- No patient data should be added to this repository.

Current desktop browsers with WebGL, ES modules, import maps and native dialogs are the target. Chromium has received the most hands-on testing; other browsers need broader verification.

See [`PHYSICS-AND-VIDEO-NOTES.md`](PHYSICS-AND-VIDEO-NOTES.md) for implementation details and [`../../THIRD_PARTY_NOTICES.md`](../../THIRD_PARTY_NOTICES.md) for media restrictions.
