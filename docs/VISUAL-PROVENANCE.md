# Visual provenance and reference research

Recorded: 2026-10-13.

## New generated assets

These files are synthetic teaching art generated from text with the built-in OpenAI `image_gen` tool. The tool did not expose a model/version selector or report a specific model version. No claim is made that they were generated using a named version, including “2.5”. No third-party clinical source image was supplied.

| Asset | Final file | Format | Intended role |
|---|---|---|---|
| Endoscopy suite | `training/assets/room-reference.png` | 1672 × 941 RGB PNG | Photographic-style environment and staging reference |
| Scope handpiece | `training/assets/scope-handpiece.png` | 1024 × 1536 RGBA PNG | Isolated hand/control-head visual reference with genuine transparency |

The handpiece alpha channel was checked: alpha range 0–254, 1,088,795 fully transparent pixels, and all four corner pixels fully transparent. Its original alpha was preserved. The generated room was edited once to remove incidental pseudo-text and equipment markings. These assets supplement the recovered `endoscopy-suite.png` and `gastroscope-control.png`; those files were not overwritten.

Generated device geometry, hand ergonomics, mannequin posture, room layout, and the synthetic monitor image remain conceptual. These are not clinical photographs, manufacturer specifications, validated anatomy, or evidence of a compliant facility. A clinician should review equipment orientation and positioning before these illustrations become instructional examples.

Original output paths:

- Initial room: `/Users/doitrous/.codex/generated_images/01a13340-abfd-79f3-9b33-7c2924c1d974/exec-b90a4bb0-58c4-4011-9c13-afdd44f89b83.png`
- Final room: `/Users/doitrous/.codex/generated_images/01a13340-abfd-79f3-9b33-7c2924c1d974/exec-c415c277-5ffb-4c6c-8d7e-aee4a0ba7ca9.png`
- Handpiece: `/Users/doitrous/.codex/generated_images/01a13340-abfd-79f3-9b33-7c2924c1d974/exec-5547b89c-d0db-441b-9415-990bbb840227.png`

## Exact generation prompts

### Room generation

```text
Use case: scientific-educational
Asset type: wide cinematic photographic environment reference for an educational upper GI endoscopy simulator; generated teaching art.
Primary request: A photorealistic modern elective endoscopy suite with an adult simulation mannequin positioned in the left lateral decubitus position on a clinical procedure bed. It is clearly a realistic medical training mannequin, resting on its LEFT side, knees slightly bent, with a blue sheet over the lower body. The head of the bed, gastroscope trolley, and endoscopy monitor tower are visible. Arrange the monitor so an operator standing at the mannequin's head can see it naturally. Show oxygen supply and suction equipment nearby, and clean organized clinical cables and equipment.
Scene/backdrop: Modern clean hospital endoscopy room, blue-grey clinical palette, warm daylight through a window.
Style/medium: Cinematic photorealistic architectural/editorial photography, believable clinical equipment, natural materials and textures.
Composition/framing: Wide landscape 16:9 view from near the foot of the bed looking toward the head and tower. Show the bed, mannequin positioning, monitor tower and trolley together. No people required.
Lighting/mood: Soft warm daylight with clean clinical fill lighting.
Constraints: No UI text, no readable words, no logos, no brands, no watermark. Monitor may show an abstract unlabelled endoscopic-looking image only. No exposed anatomy, no blood. This is a simulation training room reference, not a real clinical patient photograph.
```

### Room cleanup edit

Input: initial generated room above. Transparent background: false.

```text
Use case: precise-object-edit
Asset type: generated teaching-art endoscopy suite reference
Edit target: the provided endoscopy suite image.
Primary request: Remove every logo, brand marking, text label, tiny word, numeric readout, or letter from the equipment, bottles, drawers and monitor bezels. Replace these markings with plain matching material. On the small vital-sign monitor retain only abstract colored waveform lines with no letters, numerals, words, or UI boxes. Keep the large endoscopy monitor's abstract unlabelled mucosal image.
Invariants: Preserve exactly the composition, mannequin, left lateral posture, room, monitor tower, scope trolley, oxygen and suction equipment, warm daylight, blue-grey color palette, photorealistic rendering and wide landscape framing. Change only incidental text and logos. Do not add people, new equipment, text, labels, logos or watermarks.
```

### Scope handpiece generation

Transparent background: true.

```text
Use case: scientific-educational
Asset type: isolated photographic transparent-background gastroscope handpiece reference for an educational upper GI simulator; generated teaching art.
Primary request: A LEFT hand wearing a pale blue nitrile medical glove holding a realistic black flexible gastroscope control head upright. Show only the hand, part of the wrist, and gastroscope control head with its flexible insertion tube sweeping down. The left-hand grip is ergonomically credible: thumb can naturally access the two recognizable stacked angulation wheels while fingers wrap around the control body.
Subject details: Black textured gastroscope control housing; two recognizable angulation control wheels on the side with a larger main wheel and a smaller wheel; a BLUE air/water button and a RED suction button near the top; a recognizable biopsy channel port on the lower front; flexible black insertion tube emerging from the bottom and sweeping downward in a gentle curve. Make the control head, wheels, buttons, biopsy port, and insertion tube visually clear without inventing extra fingers or combining parts.
Style/medium: Photorealistic medical product photography with realistic black polymer texture, glove creases, natural hand anatomy, subtle studio highlights.
Composition/framing: Upright centered isolated object, portrait composition, full handpiece visible with generous transparent padding. Keep the hand to the left/back of the control head so its key parts remain visible; tube curves down toward the bottom edge.
Scene/backdrop: Genuinely transparent background with alpha, no backdrop, no room, no surface, no ground plane.
Constraints: Actual transparency; no text, no logos, no brands, no readable labels, no arrows, no watermark, no extra hands. This is generated teaching art, not a manufacturer specification or clinical photograph.
```

## Recovered asset provenance

The existing `training/assets/PROVENANCE.md` was read from the recovered workspace at `/Users/doitrous/Documents/Codex/2026-10-13/new-chat-2/endoscopy-work/training/assets/PROVENANCE.md`. It describes the earlier room and generic gastroscope art as synthetic, text-generated with the available OpenAI image tool, without a model-version claim or third-party source image. It says World Labs/FAL services were not invoked. The new generation work likewise did not invoke those services.

## Image-blaster assessment

[image-blaster](https://github.com/neilsonnn/image-blaster) is a Claude-oriented asset generation workflow combining World Labs static environments, FAL object meshes and sound generation. It produces Gaussian splats (`.spz`), meshes (`.glb`/`.obj`) and audio; its helper saves generated assets locally. Setup requires Claude and external API credentials, with `WORLD_LABS_API_KEY` and `FAL_KEY` documented in [.env.example](https://github.com/neilsonnn/image-blaster/blob/main/.env.example).

Its [MIT license](https://github.com/neilsonnn/image-blaster/blob/main/LICENSE.md) permits code reuse with the required copyright and license notice. This does not establish the rights to every external service's generated output or to input clinical photographs. Those need separate source/service terms.

Engineering assessment (inference): useful for optional visual concept experiments; it does not establish clinically validated GI lumen topology, deformable insufflation, disease placement or scope mechanics. Use independently reviewed meshes/procedural geometry for those functions. No image-blaster code or generated output was imported for these assets.

## Clinical media references and licensing

No clinical photographs from the sources below were downloaded or redistributed by this generation task.

| Source | Relevant coverage | Stated reuse terms / limitation |
|---|---|---|
| [HyperKvasir original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC7455694/) and [dataset](https://datasets.simula.no/hyper-kvasir/) | Normal Z-line, pylorus, retroflex stomach; esophagitis A and grouped B–D; Barrett and short-segment Barrett | Dataset explicitly CC BY 4.0. Credit authors/source, link license, state modifications, and cite Borgli et al., Scientific Data 7, 283 (2020), DOI 10.1038/s41597-020-00622-y. |
| [Authors’ Simula-hosted HyperKvasir paper](https://web-backend.simula.no/sites/default/files/publications/files/nature_scientific_data_hyper_kvasir_revision.pdf), pp. 7–9 | Video classes add ulcer, varices and optimal-view duodenum | Same dataset license. Video labels describe the main finding at video level; individual frame selection requires review. Check video metadata for anatomical location. |
| [ESGE 2025 performance measures, Figure 2](https://www.esge.com/assets/downloads/pdfs/guidelines/2025_a-2674-4912.pdf) | Ten landmark views including esophagus, Z-line, bulb, D2, stomach and retroflexion | PDF states all rights reserved. Appropriate as a cited reference; do not assume permission to bundle its photographs. |
| [Balaban et al., Diagnostic yield of endoscopic markers for celiac disease, Figures 1–5](https://pmc.ncbi.nlm.nih.gov/articles/PMC4656951/) | Fissures, scalloped folds, reduced folds and visible vessels in white light/NBI | Article explicitly states Creative Commons Attribution reuse; displayed notice does not specify version. Preserve the exact notice and source. Appearance alone does not establish celiac diagnosis; markers can overlap other causes of villous atrophy. |
| [Philips and Sahney, Oesophageal and gastric varices, Figures 1–2](https://pmc.ncbi.nlm.nih.gov/articles/PMC4976684/) | Small/large varices, red wale marks, cherry-red spots and bleeding stigmata | Article explicitly CC BY 4.0. Review individual figure credit lines when selecting images. |

HyperKvasir alternate distribution: [OSF](https://osf.io/mh9sj/). The dataset homepage returned intermittent 502 responses during research. [CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/).

Avoid treating open browser access or PMC hosting as a blanket reuse license. Read each article's notice and any figure-specific exclusions. Keep a per-asset source, author, license and modification record when clinical media is added.

## Rendering references

- [Three.js color management](https://threejs.org/manual/pages/color-management.html): sRGB for color maps, no color space for data maps, linear rendering, output conversion after postprocessing.
- [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): clearcoat can approximate a wet surface; added physical features increase shading cost.
- [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): current renderer requires WebGL2; supports exposure, async compilation, render statistics and adjustable resolution.
- [Three.js postprocessing](https://threejs.org/manual/pages/post-processing.html): small composed effects chain ending with OutputPass.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): batch draws, mipmap textures, bound GPU resources and avoid blocking readback in the render loop.
- [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API): optional relative mouse steering with unlock/error handling.
