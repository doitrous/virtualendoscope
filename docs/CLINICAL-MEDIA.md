# Clinical reference media

Verified: 2026-10-13. Scope: real publication photographs for the clinical reference gallery, separate from the simulator's generated teaching art.

## Gallery contract

`training/content/clinical-atlas.mjs` exports `clinicalAtlas` and a default export. Each entry includes id, title, region, caseIds, src, alt, caption, sourceTitle, sourceUrl, license, licenseUrl, credit and notes.

There are nine local-image reference entries backed by three unchanged publication image files, plus one verified external varices reference with `src: null`. Seven entries share the complete HyperKvasir Figure 1 composite. They are intentionally not represented as seven independent image files.

The saved clinical images are complete original figures. No synthesized content, enhancement, recoloring, clinical-pixel edits or panel crops remain. Viewer CSS may position or zoom the complete composite, but the caption and credit must remain visible. Do not present any publication photograph as the current simulated patient's image.

## Files and attribution

| Local file | Source / relevance | License and required credit |
|---|---|---|
| `training/assets/clinical/hyperkvasir-figure1.png` | [Borgli et al., HyperKvasir, Scientific Data 7, 283 (2020), Figure 1](https://www.nature.com/articles/s41597-020-00622-y). Normal Z-line, pylorus, retroflex stomach, esophagitis A, Barrett, varices and general upper GI ulcer panels. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). © The Author(s) 2020. Credit Hanna Borgli et al., article, DOI 10.1038/s41597-020-00622-y and Figure 1; link source and license. The figure is unchanged. |
| `training/assets/clinical/celiac-scalloping.jpg` | [Balaban et al., Diagnostic yield of endoscopic markers for celiac disease, J Med Life 8(4):452–457 (2015), Figure 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC4656951/). White-light scalloping in descending duodenum. | Article explicitly grants Creative Commons Attribution reuse, but its displayed notice and JATS do not specify a version or versioned URL. Credit DV Balaban, A Popp, F Vasilescu, D Haidautu, RM Purcarea and M Jinga; © Carol Davila University Press. Link the source notice rather than inventing CC BY 4.0. Image unchanged. |
| `training/assets/clinical/celiac-reduced-folds.jpg` | Same Balaban article, Figure 3. Reduced duodenal folds. | Same Attribution notice and credit as Figure 2. Image unchanged. |

The HyperKvasir full figure is a mixed composite: normal landmarks, diseases, interventions, upper GI and lower GI images. Its upper GI rows contain distinct labeled examples; they are not all the same disease or from one case. Individual samples are approximately 142 × 141 pixels within the 1871 × 945 figure. They support landmark/appearance comparison, not lesion measurement or independent histologic diagnosis.

Panel locations used by gallery captions:

- Normal Z-line: first upper GI row, first panel.
- Pylorus: first row, second panel.
- Retroflex stomach: first row, third panel.
- Esophagitis A: first row, sixth panel.
- Barrett: second upper GI row, first panel.
- Varices: second row, third panel.
- Ulcer: second row, fifth panel.

The source labels are preserved as labels, without assigning new grades, C/M extent, histology or bleeding-risk classifications. Duodenal scalloping and reduced folds can accompany other enteropathies; appearance alone does not establish celiac disease.

### Ulcer coverage and anatomical limitation

The visibly labeled Ulcer panel in HyperKvasir Figure 1a supplies a general upper GI appearance reference for both `gastric-ulcer` and `duodenal-ulcer` exercises. The figure and article do not identify that sample's site as gastric antrum or duodenal bulb. Accordingly, the gallery uses one entry titled “Upper GI ulcer example,” with that limitation in its caption and notes. It does not supply two independently verified, site-specific photographs, a clean-base/Forrest classification, proof of benignity or an etiology. The distinction between gastric and duodenal sampling remains grounded in the curriculum's clinical sources.

## Generated artwork actually used by the interface

The following are generated teaching art, separate from the real clinical references above. They are not manufacturer models or clinical photographs. The built-in image tool did not expose or report a specific model version; no “2.5” claim applies.

| Asset | Actual application use verified on 2026-10-13 | Provenance |
|---|---|---|
| `training/assets/endoscopy-suite.png` | Welcome-screen room background, referenced by `.welcome-image` in `training/styles.css`. | Recovered earlier text-generated asset; `training/assets/PROVENANCE.md`. |
| `training/assets/gastroscope-control.png` | Scope-function preparation checkpoint illustration in `training/app.mjs`. | Recovered earlier text-generated asset; `training/assets/PROVENANCE.md`. |
| `training/assets/scope-handpiece.png` | Live controller illustration and interactive instrument guide in `training/app.mjs`. | New text-generated asset with original alpha preserved; exact prompt and output details in `docs/VISUAL-PROVENANCE.md`. |
| `training/assets/room-reference.png` | Supporting room reference only; no runtime reference was found in the current training source. | New text-generated room, then a targeted removal of incidental markings; exact generation/edit prompts in `docs/VISUAL-PROVENANCE.md`. |

The generated images were created without third-party clinical input photographs or World Labs/FAL generation. The room reference illustrates an elective simulation setting; the handpiece is generic and its depicted ergonomics and component placement are not independently validated. Application controls and instructional text must continue to use reviewed clinical/device sources.

## Verification evidence

`training/assets/clinical/license-evidence.json` preserves publication permissions, relevant figure captions and filenames from the official [Europe PMC full-text API](https://europepmc.org/RestfulWebService). The full text was fetched for PMC7455694, PMC4656951 and PMC4976684. The relevant captions contain no separate credit exclusions. HyperKvasir's license includes article images unless a credit line excludes them.

Original downloads:

- [Publisher HyperKvasir Figure 1 PNG](https://media.springernature.com/full/springer-static/image/art%3A10.1038%2Fs41597-020-00622-y/MediaObjects/41597_2020_622_Fig1_HTML.png)
- [PMC celiac Figure 2 JPEG](https://cdn.ncbi.nlm.nih.gov/pmc/blobs/e312/4656951/33e15be6032e/JMedLife-08-452-g002.jpg)
- [PMC celiac Figure 3 JPEG](https://cdn.ncbi.nlm.nih.gov/pmc/blobs/e312/4656951/bf87de7308bb/JMedLife-08-452-g003.jpg)

Saved SHA-256 checksums:

```text
33c4b2279b932c9d559b9f7550a25d668fd50b549ada99a59cc2b70cff721d4f  hyperkvasir-figure1.png
b1875c40eb25b222dc804da4ceb3c18f2283da6afeab470f02b4ed87dff6cd56  celiac-scalloping.jpg
fb8548f8d0948370c0751a2e95881ae2ce0d431a63c94e3c936f5575a14cf412  celiac-reduced-folds.jpg
```

## External-only reference and fetch limitations

[Philips and Sahney, Oesophageal and gastric varices, Gastroenterology Report 4(3):186–195 (2016), Figure 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC4976684/) has a verified CC BY 4.0 notice. The direct figure page returned a browser challenge and its Europe PMC media ZIP timed out, so this entry has `src: null` and a source link. Its complete figure compares different varix grades and red-color signs; no image from another paper is represented as that figure.

The main HyperKvasir page intermittently failed; Nature article pages redirected to authentication; Europe PMC figure ZIP downloads timed out. The direct publisher PNG and two PMC CDN photographs succeeded. Only approximately 1.68 MB of successful image files were retained. No multi-gigabyte dataset was downloaded, no browser screenshots were used, no image generation was performed for this gallery and no old GASTROLAB photographs were copied.
