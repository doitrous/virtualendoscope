# Disease library — research and implementation record

Reviewed 9 September 2026, before disease implementation. The 23 supplied folders map to 20 selector entries: normal anatomy plus 19 disease views. The major papilla is intentionally excluded from the selector. Duplicate diverticulum and hernia views are grouped; coeliac bulb and distal-duodenal findings share a continuous case. Original folder names, every image path and SHA-256 checksum are in `references/diseases/manifest.json`. Supplied labels are not independent confirmation of histology or cause; redistribution rights have not been established.

## Evidence used for each case

| Cases | Appearance / association used | Research |
|---|---|---|
| LA B and LA D reflux oesophagitis | Separate non-bridging breaks versus extensive circumferential confluent injury. Model dimensions are not calibrated millimetres. | [LA grading in an endoscopy study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7089865/) |
| Hiatal hernia; combined hernia/polyps | Junction pouch and altered opening. Reflux may accompany hernia; polyps in the supplied combined folder are coexisting findings, not a causal consequence. | [NIDDK GERD causes](https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/symptoms-causes) |
| Varices; optional portal hypertensive gastropathy | Raised tortuous columns; optional gastric mosaic associated with portal hypertension. Not automatic. | [WGO varices reference](https://www.worldgastroenterology.org/UserFiles/file/guidelines/esophageal-varices-english-2014.pdf) |
| Inlet patch | Proximal salmon-coloured island, not distal Barrett mucosa. | [Inlet patch review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6700698/) |
| Glycogenic acanthosis | Small pale rounded plaques; no automatic systemic or reflux association. | [Benign oesophageal lesion series](https://pmc.ncbi.nlm.nih.gov/articles/PMC4306152/) |
| Oesophageal diverticulum | Lateral pocket with a separate true lumen; guided navigation does not enter the pouch. | [Diverticulum review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9992562/) |
| Oesophageal Crohn disease | Patchy ulceration; no assumed gastric involvement. | [Oesophageal presentation case](https://pmc.ncbi.nlm.nih.gov/articles/PMC5256588/) |
| Squamous cancer | Irregular protrusion with pale ulcerated areas. Non-obstructing illustrative variant, not a faithful reconstruction of advanced obstructing cancer. | [Squamous neoplasia morphology review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11164272/) |
| Alcohol-associated gastropathy | Gastric erythema/erosions. The folder's aetiology cannot be determined from photographs. | [NIDDK gastritis/gastropathy](https://www.niddk.nih.gov/health-information/digestive-diseases/gastritis-gastropathy/definition-facts) |
| Gastric hyperplastic polyps | Smooth small reddish mounds. Optional H. pylori-associated background, not the alcohol case. Histology is required to establish type. | [BSG gastric guideline](https://pmc.ncbi.nlm.nih.gov/articles/PMC6709778/) |
| Gastric GIST; duodenal subepithelial lesion | Smooth covered bulges. Optical appearance alone cannot identify GIST or prove benignity. | [ASGE subepithelial lesions](https://www.asge.org/home/resources/publications/guidelines/the-role-of-endoscopy-in-subepithelial-lesions-of-the-gi-tract) |
| Coeliac disease | Bulb/distal mosaic with reduced/scalloped folds. These markers are neither necessary nor sufficient for diagnosis. | [Prospective duodenal-marker study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6344298/) |
| Duodenal ulcer | Pale bed and erythematous rim. H. pylori gastritis is an optional shared background; NSAIDs are another common cause. | [NIDDK peptic ulcer causes](https://www.niddk.nih.gov/health-information/digestive-diseases/peptic-ulcers-stomach-ulcers/symptoms-causes) |
| Duodenal hyperplastic polyps | Small elevations; rare histological diagnosis rather than an optical certainty. | [Duodenal hyperplastic polyp report](https://pmc.ncbi.nlm.nih.gov/articles/PMC1860533/) |
| Gastric metaplasia in duodenal bulb | Nodular example; often endoscopically normal. Not synonymous with gastric intestinal metaplasia. | [Primary image report](https://onlinelibrary.wiley.com/doi/full/10.1046/j.1440-1746.2001.02448.x) |
| Duodenal adenoma in FAP | Lobulated adenomatous elevations; no automatic gastric hyperplastic polyps. | [ASGE FAP guideline](https://www.asge.org/home/resources/publications/guidelines/familial-adenomatous) |

## Downloaded material

- `references/research/wgo-varices.pdf`: public WGO 2014 reference, downloaded from the above official URL. Used for morphology/background only, not current treatment recommendations.
- `references/research/asge-fap.pdf`: official ASGE 2020 guideline, downloaded from the ASGE public document library, linked through the FAP page above.
- `disease-catalog.mjs`: locally stored concise interpreted case data and source links for every case, available through Case details.
- Supplied photographic references were sufficient for this prototype's visual comparison; no external proprietary images or unverified disease-specific 3D models were imported. PDFs are reference documents, not a grant to redistribute their figures. No reference file is executed.

## Limits and verification

These are synthetic region-specific appearances and mesh changes, not photogrammetric reconstructions or validated disease simulators. Bulges and pockets affect cavity geometry; erosions, inlet patches and some ulcer details are surface-colour approximations. Coeliac fold changes are illustrative. The guided path remains traversable by design, even in the cancer case; this must not teach advancing through an obstructing cancer. Scope mechanics, diagnosis, histology, pressure response and treatment are not validated. A gastroenterologist must review all scenarios before student assessment use.

Companions are opt-in. Reflux oesophagitis does not automatically create gastritis. Selection stops travel without resetting insertion progress or insufflation; View finding is an explicit region jump. Reset returns to entry but preserves the selected case and gas setting. Shortcuts and settings are dialogs; they do not require navigating away from the simulation.

Automated checks cover all folder mappings, source presence, companion rules, finite appearances and a continuous traversable centreline for all cases/combinations, plus existing motility, shaft and fluid tests. Browser checks cover case switching, related findings, reference display and keyboard-shortcut dialog. Photorealism and clinical validity are not established by these tests.
