# Case and media evidence

> Recovered planning/research snapshot from the earlier unpublished work. Statements about missing assets, planned architecture and media exclusion describe that baseline. For current implementation and remaining limits, see [the current plan](UPPER-GI-WORLD-PLAN.md), [clinical audit](CLINICAL-SOURCES.md), [published atlas rights](CLINICAL-MEDIA.md) and [release evidence](RELEASE-READINESS.md).


Reviewed 13 October 2026. The seven cases in `training/content/cases.mjs` use fictional patients. Scenarios teach observed findings, complete inspection, documentation and supervised next steps. They do not claim histological diagnosis, procedural competence or therapeutic readiness.

## Content checkpoints

| Case | Visual checkpoint | Interpretation and sampling constraint | Current mesh mapping |
|---|---|---|---|
| Normal EGD | Esophagus, junction, full stomach including retroflexion, bulb and D2 | Report “no visible abnormality”; normal appearance does not exclude microscopic disease. No histological indication is supplied in this case. | `normal` |
| Reflux esophagitis | Distal mucosal breaks; relationship to fold tops and extent | Uncomplicated LA A/B does not routinely need biopsy. Color alone is insufficient for a grade. The mesh is illustrative, not a calibrated ruler. | `reflux-b` |
| Suspected Barrett | Columnar-appearing segment above proximal gastric folds; separate Z-line and pinch | Endoscopic suspicion precedes pathology. Under the ACG profile, confirmation requires appropriate histology. No routine biopsy of an uncomplicated irregular Z-line under 1 cm. | **Unavailable**; no inlet-patch or hernia substitution |
| Gastric ulcer | Location, size, base, border, bleeding stigmata | Do not declare benignity or H. pylori from appearance. For this nonbleeding case, supervised edge/base sampling is indicated (BSG: six when feasible). Deferral for bleeding/therapy needs early repeat assessment. | **Unavailable**; no duodenal-ulcer substitution |
| Duodenal ulcer | Typical bulb ulcer with clean base; inspect for atypical features | No routine biopsy of a typical duodenal ulcer without malignancy-suggesting features. Etiology needs clinical/testing evidence. | `duodenal-ulcer` |
| Varices | Tortuous vascular columns; observed risk signs | **Never biopsy a suspected varix in this simulator.** Document and escalate. An adjacent lesion or active bleeding requires specialist management. | `varices` |
| Celiac suspicion | Patchy mosaic/scalloping/reduced duodenal folds | These indicate possible enteropathy, not confirmed celiac disease. The case has tTG-IgA below 10× ULN and ongoing gluten exposure so appropriate bulb/D2 sampling is a consistent teaching choice. | `celiac` |

The biopsy values describe these specific scenarios. A `required` value must not be interpreted as an unconditional action in bleeding, suspected vascular tissue, impaired views or an unsafe clinical setting. Photo-document detected lesions before sampling. The renderer should retain a visible finding/interpretation distinction and offer pathology follow-up rather than instantly announcing confirmed disease.

## Anatomy and inspection

[ESGE 2025](https://www.esge.com/assets/downloads/pdfs/guidelines/2025_a-2674-4912.pdf), pages 10–12, retains a ten-photo proposal: proximal esophagus; distal esophagus; Z-line/diaphragmatic indentation; bulb; D2; antrum; cardia/fundus in full inversion; lesser corpus curvature in partial inversion; incisura in partial inversion; greater corpus curvature in forward view. Photograph abnormal findings too. Visibility, systematic survey and adequate inspection time matter; collecting photographs alone does not establish quality.

ESGE proposes esophageal/duodenal photos during insertion and gastric photos during withdrawal. [BSG/AUGIS 2026 best practice](https://doi.org/10.1136/flgastro-2025-103455) proposes full esophageal assessment, complete antegrade/retroflex gastric assessment, then duodenum. Score coverage and quality rather than treating one sequence as universal. The app's learning-session duration is not a clinical procedure-time measurement. Do not withdraw a retroflexed scope into the tubular esophagus.

## Clinical sources and guideline profile

| Source | Content supported |
|---|---|
| [ESGE upper GI quality update 2025](https://www.esge.com/assets/downloads/pdfs/guidelines/2025_a-2674-4912.pdf) | Landmark photos, systematic inspection, visibility, standardized description, Barrett surveillance principles |
| [BSG/AUGIS/RCPath biopsy guidance 2025](https://doi.org/10.1136/flgastro-2025-103316) | Gastric ulcer edge/base sampling, uncomplicated LA A/B and typical duodenal ulcer no-biopsy guidance, irregular Z-line constraint, dangers of sampling a varix/subepithelial lesion, lesion photography before biopsy |
| [BSG/AUGIS upper GI best practice 2026](https://doi.org/10.1136/flgastro-2025-103455) | Inspection, ulcer morphology, variceal morphology/risk signs and follow-up |
| [ACG Barrett guideline 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC10259184/) | Junctional landmarks, qualifying segment, histological confirmation and structured sampling |
| [ACG celiac guideline 2023](https://doi.org/10.14309/ajg.0000000000002075) | Multiple duodenal samples, including 1–2 bulb and at least 4 post-bulbar samples; clinical/serological/pathological confirmation |
| [Shah et al., primary study, 2000](https://pubmed.ncbi.nlm.nih.gov/10840307/) | Scalloping, mosaic pattern and reduced folds indicate mucosal injury; scalloping is not specific for celiac disease |

Celiac rules must name their profile: ACG 2023 generally recommends biopsy confirmation in adult suspicion; BSG 2025 permits a suitable no-biopsy pathway with IgA tTG ≥10× ULN, and uses two bulb plus four D2 samples when biopsy is needed. Do not present one universal rule. Barrett diagnostic requirements also differ internationally; this case names the ACG profile.

## Media candidates and verified restrictions

These are **source links and rights research**, not imported assets. Current prototype reference assets have not been cleared for this published suite. A file being reachable online is not reuse permission.

| Candidate | Verified rights and attribution | Use and limitations |
|---|---|---|
| [Official HyperKvasir repository](https://github.com/simula/hyper-kvasir), [license](https://github.com/simula/hyper-kvasir/blob/master/LICENSE.md), [dataset paper](https://doi.org/10.1038/s41597-020-00622-y) | LICENSE is CC BY 4.0; **README additionally says competitions/commercial purposes require prior written permission**. Preserve attribution and record changes. Resolve the conflicting terms in writing before commercial use. | Educational/research candidate for normal Z-line, normal pylorus, retroflex stomach, esophagitis and Barrett. Its class labels are not a substitute for individual expert review or linked patient histology. No labeled gastric-ulcer/varices/celiac class in its listed 23 image classes. |
| [Deep gastric ulcer.png](https://commons.wikimedia.org/wiki/File:Deep_gastric_ulcer.png) | Samir; CC BY-SA 3.0 (also GFDL). Credit creator, link source/license, identify modifications; adaptations require compatible share-alike terms. | Clinical antral-ulcer reference. Low resolution; do not infer etiology or benignity. |
| [DU 2.jpg](https://commons.wikimedia.org/wiki/File:DU_2.jpg) | Samir_grover; file offers CC BY-SA 4.0 and other options. Prefer one explicit license; give credit/link and mark changes; share alike for adaptations. | Posterior-wall clean-base duodenal ulcer. Description records patient permission; follow the explicit file license rather than relying on the caption's public-domain wording. |
| [Esophageal varices – wale.jpg](https://commons.wikimedia.org/wiki/File:Esophageal_varices_-_wale.jpg) | Samir; explicit worldwide public-domain dedication, with fallback permission for any purpose where dedication is unavailable. Original upload log records patient permission. Credit/source still recommended. | Clinical varices with red wale spots. Only about 315×286 pixels; suitable as a reference, not high-resolution validation. |
| [Bleeding esophageal varices.png](https://commons.wikimedia.org/wiki/File:Bleeding_esophageal_varices.png) | Jeremias, own work; CC BY-SA 4.0. Attribution, source/license link, changes, and compatible share-alike adaptations. | Active bleeding reference; use only in an explicitly different urgent-bleeding scenario, not the present nonbleeding case. |
| [Celiac endo.JPG](https://commons.wikimedia.org/wiki/File:Celiac_endo.JPG) | Samir at English Wikipedia; CC BY-SA 3.0 (also GFDL). Attribution/source/license/changes; compatible share-alike adaptations. | Clinical scalloping/cracked-mud reference. About 311×261 pixels. The depicted patient's caption is not enough to train a universal diagnostic rule. |

Store an asset manifest before importing: original URL and revision, creator, chosen license URL, attribution, downloaded file hash, modifications, intended case, clinician review and whether synthetic or patient-origin. Share-alike applies to the adapted media; do not silently relicense it with repository code. Review figure-specific credit lines before using a guideline's illustrations: an open article can contain third-party figures with different rights. StatPearls examples with CC BY-NC-ND are poor candidates for adapted/commercial scenes.

## Synthetic scene labels and review gates

Recommended persistent label: **“Synthetic training illustration — not a patient recording. Intended finding: [finding]. Diagnosis requires clinical and, where appropriate, pathology confirmation.”** Keep the label beside the image and in exports; do not hide it only in an About page. For the current mesh, use **“Illustrative 3D anatomy”**.

This is a product recommendation, not evidence that a generative model produces medically validated images. Generated frames can invent folds, lesion edges, vascular patterns, depth or continuity. A coherent-looking sequence does not establish physically correct anatomy or scope mechanics. Do not use generated imagery as sole reference truth or as a competence test.

Before release, an endoscopist should verify each intended finding, absence of misleading incidental findings, landmark identity, lesion localization, view continuity and sampling masks. Geometry and disease masks should be deterministic enough that a varix cannot accidentally become a valid biopsy target. Synthetic-only cases remain explicitly illustrative until reviewed; do not claim expert validation before it happens. Reference-conditioned generation still needs source rights clearance and accurate derivative labeling.

## Theory room: upper versus lower indications

Use [ASGE appropriate-use guidance](https://www.asge.org/home/resources/publications/guidelines/appropriate-use-of-gi-endoscopy) as the broad professional framework, supplemented by current condition-specific guidance. It dates to 2012; do not reuse its old screening ages as current policy.

| Upper endoscopy examples | Lower endoscopy / colonoscopy examples |
|---|---|
| Persistent upper symptoms after appropriate initial management; dysphagia; upper GI bleeding; indicated investigation of anemia; assessment of suspected celiac or other upper GI pathology; risk-based Barrett evaluation and surveillance; directed therapeutic procedures | Colorectal screening and indicated surveillance; follow-up of abnormal screening results; rectal bleeding; unexplained bowel change/chronic diarrhea; evaluation of inflammatory bowel disease; indicated investigation of anemia; polyp assessment/removal |

Accessible patient explanations: [NIDDK upper GI endoscopy](https://www.niddk.nih.gov/health-information/diagnostic-tests/upper-gi-endoscopy) and [NIDDK colonoscopy](https://www.niddk.nih.gov/health-information/diagnostic-tests/colonoscopy). Distinguish symptom investigation, screening and surveillance. Endoscopy is not automatically indicated for every episode of heartburn, abdominal pain or constipation; select the relevant clinical context and local guideline. Any screening-age lesson should state its country/profile and review date.
