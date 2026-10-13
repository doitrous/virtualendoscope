# Third-party notices

The [MIT License](LICENSE) covers original code and synthetic mesh assets. It does not relicense photographs, publication figures, research PDFs, fonts or dependencies.

## Attributed atlas included in training

`training/content/clinical-atlas.mjs` provides complete, unchanged publication figures with captions, author credits, source and license links. Seven entries share one HyperKvasir composite; they are not seven separate photographs.

| File | Source and credit | License |
| --- | --- | --- |
| `training/assets/clinical/hyperkvasir-figure1.png` | Hanna Borgli et al., *HyperKvasir*, Scientific Data 7, 283 (2020), Figure 1. © The Author(s). [Publication](https://www.nature.com/articles/s41597-020-00622-y) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `training/assets/clinical/celiac-scalloping.jpg` | DV Balaban, A Popp, F Vasilescu, D Haidautu, RM Purcarea and M Jinga, *Diagnostic yield of endoscopic markers for celiac disease* (2015), Figure 2. © Carol Davila University Press. [Publication](https://pmc.ncbi.nlm.nih.gov/articles/PMC4656951/) | Creative Commons Attribution; publication notice does not specify a version. Link that notice; do not relabel it CC BY 4.0. |
| `training/assets/clinical/celiac-reduced-folds.jpg` | Same Balaban publication and author credit, Figure 3. | Same Attribution notice as Figure 2. |

The external-only varices reference links to Philips and Sahney (2016), [Figure 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC4976684/), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). No local image from that publication is shipped.

[CLINICAL-MEDIA.md](docs/CLINICAL-MEDIA.md) records captions, limitations, downloads and checksums. `training/assets/clinical/license-evidence.json` records permissions checked against publication full text on 2026-10-13. Preserve attribution and license links when redistributing; identify later changes. Publication licenses do not validate the simulator or diagnose its fictional patients.

## Legacy material excluded from training

`prototypes/upper-gi-mesh/references/` contains historical photographs, videos and research documents. Most photographs were contributor-attributed to [GASTROLAB](https://gastrolab.net/), but individual creators and reuse permissions have not been independently verified. These are distinct from the verified atlas.

The training build omits that references directory, and its server refuses reference-media paths. The separate original laboratory retains its galleries. Presence in the repository is not a grant of redistribution rights. Owners may request correction or removal through the project issue tracker. Research PDFs remain subject to publisher terms; clinical links can be followed without republishing the PDFs.

## Generated artwork

Room and instrument images are synthetic project artwork documented in [VISUAL-PROVENANCE.md](docs/VISUAL-PROVENANCE.md) and `training/assets/PROVENANCE.md`. They are not patient photographs or validated manufacturer models. The image tool did not report a specific model version; no model-version claim applies. Real atlas figures remain separate under the licenses above.

## Fonts and libraries

- **Three.js 0.159.0:** MIT; © three.js authors. Its license is retained at `dist/vendor/three/LICENSE`.
- **Figtree:** SIL Open Font License 1.1; © 2022 The Figtree Project Authors. Its license is retained at `dist/vendor/font/LICENSE`.
- Other third-party files retain their distributed terms; the repository MIT license does not override them.

No endorsement by clinical societies, publishers, authors or equipment brands is claimed.
