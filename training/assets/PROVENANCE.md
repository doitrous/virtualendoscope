# Training asset provenance

## Generated teaching art

The four generated images were created on 2026-10-13 with the available OpenAI `image_gen` tool. The tool does not expose a model-version selector; no claim is made that these images use a specific model version, including 2.5.

- `endoscopy-suite.png`: photorealistic conceptual academic-hospital endoscopy suite, simulation mannequin and teal covering, trolley, endoscopy stack and articulated monitor, offwhite/oak/teal palette. Generated from text with no third-party source image.
- `gastroscope-control.png`: generic flexible gastroscope studio concept, control head, angulation wheels, valves, biopsy port and flexible tube. Generated from text with no third-party source image.
- `scope-handpiece.png`: generic black gastroscope control head held in a pale-blue gloved hand, with angulation wheels, colored valves, biopsy port and insertion tube. Generated from text with no third-party source image; its original RGBA transparency is preserved.
- `room-reference.png`: wide photographic-style elective endoscopy simulation suite with mannequin, monitor tower, trolley, oxygen/suction and daylight. Generated from text, then edited to remove incidental equipment markings; no third-party source image was supplied.

Actual uses verified on 2026-10-13:

| Asset | Current use |
|---|---|
| `endoscopy-suite.png` | Welcome-screen background in `training/styles.css`. |
| `gastroscope-control.png` | Scope-function preparation checkpoint in `training/app.mjs`. |
| `scope-handpiece.png` | Live controller illustration and interactive instrument guide in `training/app.mjs`. |
| `gastric-mucosa-v2.png` | Generated diffuse detail for the live tissue material; exact prompt and limits in [MUCOSA-VISUAL-PROVENANCE.md](../../docs/MUCOSA-VISUAL-PROVENANCE.md). |
| `room-reference.png` | Unused design reference; no runtime reference was found in the current training source. |

These images are synthetic art direction for the training application's visual environment. They are not clinical reference photographs, validated medical equipment models, validated anatomy, or evidence of a compliant clinical facility. Rendered device geometry, valve placement, tube details, display content and room arrangement may depart from real equipment and clinical practice. Educational controls and procedures must be grounded in reviewed clinical sources independently of these images.

No identifiable real patient appears in the generated artwork, and these generated images do not represent or endorse a specific equipment brand. Image-generation output may contain small incidental pseudo-text or visual artifacts; it should not be treated as labeling.

The first two images were recovered from the earlier training workspace. The new handpiece and room originals are in `/Users/doitrous/.codex/generated_images/01a13340-abfd-79f3-9b33-7c2924c1d974/`; exact new generation/edit prompts and output filenames are recorded in [VISUAL-PROVENANCE.md](../../docs/VISUAL-PROVENANCE.md). Paid World Labs/FAL world-generation services were not invoked.

## Licensed real clinical reference images

The separate `clinical/` directory redistributes explicitly licensed publication images. These are real endoscopy references, not generated teaching art or images of the simulator's fictional patients:

- `clinical/hyperkvasir-figure1.png`: complete, unchanged HyperKvasir Figure 1 from Borgli et al., Scientific Data 7, 283 (2020), © The Author(s), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The composite mixes normal landmarks, diseases, interventions, and upper/lower GI examples; its small panels have distinct labels.
- `clinical/celiac-scalloping.jpg` and `clinical/celiac-reduced-folds.jpg`: unchanged Figures 2 and 3 from Balaban et al., J Med Life 8(4):452–457 (2015), © Carol Davila University Press. The article explicitly grants Creative Commons Attribution reuse; its notice does not specify a version. The gallery links the article's notice instead of assigning an unsupported version.

Publication credit, source links, license links/notices, anatomical limits and fetch evidence are recorded in [CLINICAL-MEDIA.md](../../docs/CLINICAL-MEDIA.md), `clinical/license-evidence.json`, and each entry in `training/content/clinical-atlas.mjs`. The complete clinical figures are retained unchanged; no panel crops remain. The Philips/Sahney varices comparison is an external-only source link with `src: null`, because its figure download did not succeed. No old GASTROLAB photographs were copied.
