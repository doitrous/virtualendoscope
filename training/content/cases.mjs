// Fictional supervised-learning scenarios. Visual findings are not histology.
// Clinical rules are scoped to the named sources and the facts of each scenario.
export const sources = [
  { id: 'esge-ugi-2025', title: 'ESGE upper GI endoscopy performance measures, update 2025', url: 'https://www.esge.com/assets/downloads/pdfs/guidelines/2025_a-2674-4912.pdf', year: 2025, kind: 'society-guideline' },
  { id: 'bsg-biopsy-2025', title: 'BSG/AUGIS/RCPath consensus guidance on upper GI biopsy sampling', url: 'https://doi.org/10.1136/flgastro-2025-103316', year: 2025, kind: 'society-guideline' },
  { id: 'bsg-ugi-2026', title: 'BSG/AUGIS best practice for upper GI endoscopy', url: 'https://doi.org/10.1136/flgastro-2025-103455', year: 2026, kind: 'society-guideline' },
  { id: 'acg-barrett-2022', title: 'ACG diagnosis and management of Barrett’s esophagus', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10259184/', year: 2022, kind: 'society-guideline' },
  { id: 'acg-celiac-2023', title: 'ACG diagnosis and management of celiac disease', url: 'https://doi.org/10.14309/ajg.0000000000002075', year: 2023, kind: 'society-guideline' },
  { id: 'shah-scalloping-2000', title: 'All that scallops is not celiac disease', url: 'https://pubmed.ncbi.nlm.nih.gov/10840307/', year: 2000, kind: 'primary-study' },
  { id: 'niddk-egd', title: 'NIDDK: Upper GI endoscopy', url: 'https://www.niddk.nih.gov/health-information/diagnostic-tests/upper-gi-endoscopy', year: 2023, kind: 'government-patient-information' },
  { id: 'niddk-colonoscopy', title: 'NIDDK: Colonoscopy', url: 'https://www.niddk.nih.gov/health-information/diagnostic-tests/colonoscopy', year: 2023, kind: 'government-patient-information' },
  { id: 'asge-indications-2012', title: 'ASGE: Appropriate use of GI endoscopy', url: 'https://www.asge.org/home/resources/publications/guidelines/appropriate-use-of-gi-endoscopy', year: 2012, kind: 'society-guideline' },
  { id: 'bsg-celiac-2026', title: 'BSG adult coeliac disease guideline', url: 'https://www.bsg.org.uk/clinical-resource/bsg-guidelines-adult-coeliac-disease', year: 2026, kind: 'society-guideline' },
  { id: 'bsg-quality-2017', title: 'BSG/AUGIS upper GI quality standards', url: 'https://www.bsg.org.uk/clinical-resource/ugi-endoscopy-quality-standards', year: 2017, kind: 'society-guideline' },
  { id: 'asge-hp-2013', title: 'ASGE endoscopic mucosal tissue sampling', url: 'https://www.asge.org/home/resources/publications/guidelines/endoscopic-mucosal-tissue-sampling', year: 2013, kind: 'society-guideline' },
].map(source => ({
  ...source,
  organization: source.id.startsWith('bsg-') ? 'BSG / partner societies' : source.id.startsWith('esge-') ? 'ESGE' : source.id.startsWith('acg-') ? 'ACG' : source.id.startsWith('asge-') ? 'ASGE' : source.id.startsWith('niddk-') ? 'NIH / NIDDK' : 'Shah et al.',
  reviewed: '2026-10-13',
}));

const electiveFasting = 'Fictional elective case: last light meal 8 hours ago; last water 3 hours ago. Verify actual intake, symptoms, delayed-emptying risk and the individualized local plan before proceeding.';
const patient = (name, age, sex, indication, history, medications, asa = 'II') => ({
  name, age, sex, indication, history, medications,
  allergies: 'None reported in this fictional scenario; verify before the procedure.',
  asa, fasting: electiveFasting,
  sedationPlan: 'Discuss options and obtain consent. A trained supervising team assesses suitability, monitoring and recovery; medication dosing is outside this exercise.',
});

export const cases = [
  {
    id: 'normal-egd', title: 'Normal upper GI survey', subtitle: 'Complete examination and documentation', difficulty: 'Foundation', duration: '15 min learning session',
    description: 'A fictional patient with persistent upper abdominal symptoms after initial treatment. Practice systematic inspection. A normal macroscopic examination does not exclude every cause of symptoms.',
    patient: patient('Training Patient 01', 48, 'Female', 'Persistent dyspepsia despite an appropriate initial treatment trial.', 'No dysphagia, bleeding, anaemia or weight loss. No previous upper GI surgery.', ['Intermittent antacid']),
    findings: [
      { id: 'normal-esophagus', region: 'entry', clinicalRegion: 'esophagus', title: 'No visible esophageal abnormality', appearance: 'Smooth squamous lining and a visible mucosal transition. Identify the Z-line, proximal gastric folds and diaphragmatic indentation separately.', interpretation: 'No visible lesion in the inspected esophagus; this does not establish the cause of symptoms.', action: 'Inspect and photograph the proximal and distal esophagus and junctional landmarks.', biopsy: 'none', sourceIds: ['esge-ugi-2025'] },
      { id: 'normal-stomach', region: 'body', clinicalRegion: 'stomach', title: 'No visible gastric abnormality', appearance: 'Gastric folds and antral mucosa without a focal ulcer, mass or bleeding in this scenario.', interpretation: 'No visible gastric lesion on a complete, adequately cleaned survey.', action: 'Inspect the antrum, corpus and incisura; obtain appropriate forward and retroflexed views of the cardia and fundus.', biopsy: 'none', sourceIds: ['esge-ugi-2025', 'bsg-ugi-2026'] },
      { id: 'normal-duodenum', region: 'descending', clinicalRegion: 'duodenum', title: 'No visible duodenal abnormality', appearance: 'Bulb and second part without focal ulceration or obvious abnormal folds in this scenario.', interpretation: 'Normal appearance does not exclude microscopic disease. There is no celiac or other histological indication supplied for this case.', action: 'Document both the bulb and second part before completing the survey.', biopsy: 'none', sourceIds: ['esge-ugi-2025', 'acg-celiac-2023'] },
    ],
    objectives: ['Identify all required landmarks.', 'Improve visibility before recording an observation.', 'Capture representative landmark photographs.', 'Report no visible abnormality without claiming all disease is excluded.'],
    sourceIds: ['esge-ugi-2025', 'bsg-ugi-2026', 'niddk-egd'], meshCaseIds: ['normal'],
  },
  {
    id: 'reflux-esophagitis', title: 'Distal mucosal breaks', subtitle: 'Reflux esophagitis teaching pattern', difficulty: 'Foundation', duration: '15 min learning session',
    description: 'A fictional reflux case: describe distal mucosal injury before selecting an interpretation. The LA-B mesh is illustrative: size and grade must not be treated as measurements from a photograph.',
    patient: patient('Training Patient 02', 52, 'Male', 'Persistent reflux symptoms despite treatment.', 'Heartburn and acid regurgitation. No dysphagia or evidence of GI bleeding.', ['Prescribed acid suppression']),
    findings: [
      { id: 'distal-breaks', region: 'entry', clinicalRegion: 'distal-esophagus', title: 'Separate distal esophageal mucosal breaks', appearance: 'Discrete mucosal breaks in the distal esophagus, without bridging between the tops of adjacent folds in the teaching scene.', interpretation: 'Appearance is consistent with reflux esophagitis. Document extent with the Los Angeles classification only when the view and scale permit; redness alone is insufficient.', action: 'Photograph before any sampling; assess the junction and complete the examination. Routine biopsy is not indicated for uncomplicated LA A/B esophagitis in this scenario.', biopsy: 'none', sourceIds: ['bsg-biopsy-2025', 'bsg-ugi-2026'] },
    ],
    objectives: ['Distinguish mucosal breaks from nonspecific redness.', 'Describe the extent and relationship to folds.', 'Avoid routine biopsy of uncomplicated LA A/B esophagitis.', 'Finish the landmark survey after detecting a lesion.'],
    sourceIds: ['bsg-biopsy-2025', 'bsg-ugi-2026'], meshCaseIds: ['reflux-b'],
  },
  {
    id: 'suspected-barrett', title: 'Suspected Barrett’s mucosa', subtitle: 'Landmarks, extent and tissue confirmation', difficulty: 'Intermediate', duration: '20 min learning session',
    description: 'Fictional case: a distal esophageal columnar-lined segment is an endoscopic suspicion. This initial diagnostic exercise uses the ACG 2022 sampling profile, not a universal fixed count for every Barrett examination. Histology is required; dysplasia is not inferred from color. The synthetic scene remains unvalidated.',
    patient: patient('Training Patient 03', 61, 'Male', 'Risk-based assessment after longstanding reflux symptoms.', 'Longstanding reflux and a first-degree family history of Barrett’s esophagus. No known portal hypertension.', ['Prescribed proton pump inhibitor']),
    findings: [
      { id: 'columnar-segment', region: 'entry', clinicalRegion: 'distal-esophagus', title: 'Columnar-appearing distal segment', appearance: 'Salmon-colored tongues and a circumferential segment above the proximal gastric folds; the intended C2M3 extent is illustrative. Distinguish the top of gastric folds, Z-line and diaphragmatic pinch.', interpretation: 'Suspected Barrett’s esophagus, pending a properly acquired biopsy result. The synthetic scene cannot establish intestinal metaplasia or dysplasia.', action: 'Clean, inspect and photograph; document extent using Prague C/M when measurable. Under supervision, obtain the eight samples specified for this illustrative qualifying C2M3 segment; target visible abnormalities separately. One sample does not complete the protocol. Do not routinely biopsy a normal Z-line or a segment under 1 cm without a focal mucosal abnormality. Do not sample any suspected varix.', biopsy: 'required', sampleCount: 8, sourceIds: ['acg-barrett-2022', 'bsg-biopsy-2025', 'esge-ugi-2025'] },
    ],
    objectives: ['Separate endoscopic suspicion from histological diagnosis.', 'Identify junctional landmarks before judging extent.', 'Explain why an uncomplicated irregular Z-line under 1 cm does not trigger routine biopsy.', 'Choose supervised guideline-based sampling and a histology follow-up plan.'],
    sourceIds: ['acg-barrett-2022', 'bsg-biopsy-2025', 'esge-ugi-2025'], meshCaseIds: ['barrett'],
    visualRequirement: { status: 'synthetic-unvalidated', region: 'entry', clinicalRegion: 'distal-esophagus', label: 'Synthetic suspected Barrett’s scene; clinician review is pending.', intendedSegment: 'Illustrative C2M3 segment above the proximal gastric folds; scale is not a clinical measurement. Eight samples illustrate the selected ACG diagnostic sampling plan.' },
  },
  {
    id: 'gastric-ulcer', title: 'Gastric ulcer assessment', subtitle: 'Describe, sample appropriately and plan follow-up', difficulty: 'Intermediate', duration: '20 min learning session',
    description: 'A fictional nonbleeding antral ulcer exercise. An apparently benign ulcer still needs assessment and tissue sampling; appearance cannot exclude malignancy or identify H. pylori. The synthetic teaching scene remains unvalidated.',
    patient: patient('Training Patient 04', 66, 'Female', 'Persistent epigastric pain with concern for peptic ulcer disease.', 'Regular NSAID exposure for joint pain. No active bleeding or known portal hypertension.', ['Regular NSAID', 'Prescribed acid suppression']),
    findings: [
      { id: 'antral-ulcer', region: 'antrum', clinicalRegion: 'antrum', title: 'Nonbleeding antral mucosal defect', appearance: 'A crater-like mucosal defect with a pale base and erythematous margin in the intended scene. Record location, measured size if available, border and base.', interpretation: 'Gastric ulcer appearance; benignity, malignancy and cause remain unconfirmed.', action: 'Photograph first. In this stable nonbleeding case, obtain six supervised edge/base samples when feasible. Arrange H. pylori assessment and histology ownership. If biopsy is deferred for bleeding or therapy, repeat within 2 weeks. After appropriate treatment, plan a healing review, typically at 6–8 weeks under the BSG quality standard.', biopsy: 'required', sampleCount: 6, sourceIds: ['bsg-biopsy-2025', 'bsg-ugi-2026', 'bsg-quality-2017', 'asge-hp-2013'] },
    ],
    objectives: ['Describe ulcer site, border, base and bleeding stigmata.', 'Avoid labeling an ulcer benign from appearance alone.', 'Select supervised tissue sampling appropriate to the scenario.', 'Include review of histology and healing in the follow-up plan.'],
    sourceIds: ['bsg-biopsy-2025', 'bsg-ugi-2026', 'bsg-quality-2017', 'asge-hp-2013'], meshCaseIds: ['gastric-ulcer'],
    visualRequirement: { status: 'synthetic-unvalidated', region: 'antrum', clinicalRegion: 'antrum', label: 'Synthetic gastric-ulcer scene; clinician review is pending.' },
  },
  {
    id: 'duodenal-ulcer', title: 'Duodenal bulb ulcer', subtitle: 'Recognize a typical nonbleeding ulcer', difficulty: 'Foundation', duration: '15 min learning session',
    description: 'Fictional case: inspect a typical clean-base duodenal bulb ulcer and complete the survey. H. pylori and NSAID exposure are considerations, not visible diagnoses.',
    patient: patient('Training Patient 05', 44, 'Male', 'Persistent epigastric pain suggesting peptic ulcer disease.', 'No active bleeding, weight loss or prior upper GI surgery. H. pylori status unknown.', ['Occasional NSAID']),
    findings: [
      { id: 'bulb-ulcer', region: 'bulb', clinicalRegion: 'duodenal-bulb', title: 'Typical clean-base bulb ulcer', appearance: 'Focal pale ulcer base with a surrounding erythematous rim; no visible vessel, active bleeding or atypical irregular mass in this teaching case.', interpretation: 'Duodenal ulcer appearance. Endoscopy alone does not establish etiology.', action: 'Document site, base and bleeding stigmata. Do not routinely biopsy a typical duodenal ulcer without features suggesting malignancy; atypical findings change the sampling decision. Discuss appropriate H. pylori assessment and follow-up with the supervisor.', biopsy: 'none', sourceIds: ['bsg-biopsy-2025'] },
    ],
    objectives: ['Localize the lesion to the duodenal bulb.', 'Describe the ulcer base and bleeding stigmata.', 'Distinguish gastric from typical duodenal ulcer sampling decisions.', 'Avoid diagnosing H. pylori from the mucosal view.'],
    sourceIds: ['bsg-biopsy-2025', 'niddk-egd', 'asge-hp-2013'], meshCaseIds: ['duodenal-ulcer'],
  },
  {
    id: 'esophageal-varices', title: 'Esophageal varices', subtitle: 'Recognize vascular columns and avoid biopsy', difficulty: 'Intermediate', duration: '20 min learning session',
    description: 'A fictional nonbleeding portal-hypertension case. Recognition, documentation and escalation are the targets; invasive treatment is outside this introductory exercise.',
    patient: patient('Training Patient 06', 58, 'Male', 'Specialist-directed assessment for varices in known cirrhosis.', 'Known cirrhosis and portal hypertension. No hematemesis or current hemodynamic instability in this fictional scenario.', ['Medication list reviewed with the supervising liver team'], 'III'),
    findings: [
      { id: 'variceal-columns', region: 'entry', clinicalRegion: 'esophagus', title: 'Tortuous submucosal vascular columns', appearance: 'Longitudinal raised, tortuous submucosal columns. Inspect for red wale marks and other bleeding-risk signs without assuming every varix has them.', interpretation: 'Variceal appearance in a patient with portal hypertension. Record the chosen classification and observed risk signs.', action: 'NEVER biopsy a suspected varix in this simulator. Photograph and document; escalate to the supervising specialist. Active bleeding requires an urgent clinical pathway, not routine sampling. A possible adjacent lesion is also a specialist decision.', biopsy: 'avoid', sourceIds: ['bsg-biopsy-2025', 'bsg-ugi-2026'] },
    ],
    objectives: ['Recognize vascular columns rather than treating them as mucosal masses.', 'Identify and describe observed bleeding-risk signs.', 'Avoid biopsy of suspected varices.', 'Escalate concerning findings to the supervising specialist.'],
    sourceIds: ['bsg-biopsy-2025', 'bsg-ugi-2026'], meshCaseIds: ['varices'],
  },
  {
    id: 'suspected-celiac', title: 'Suspected celiac disease', subtitle: 'Duodenal appearance, serology and sampling', difficulty: 'Intermediate', duration: '20 min learning session',
    description: 'This fictional patient is consuming gluten, with elevated tTG-IgA below 10 times the upper limit of normal and adequate total IgA. The clinician has selected histology. Use the BSG 2025/2026 profile: four D2 and two bulb samples in separate containers. Specialist no-biopsy pathways have additional eligibility considerations and are outside this case; morphology alone is not diagnostic.',
    patient: patient('Training Patient 07', 35, 'Female', 'Chronic diarrhea and iron deficiency with elevated celiac serology.', 'Gluten-containing diet; tTG-IgA 3 times the upper limit of normal and total IgA within the laboratory reference range. No established celiac diagnosis.', ['Oral iron']),
    findings: [
      { id: 'bulb-mosaic', region: 'bulb', clinicalRegion: 'duodenal-bulb', title: 'Patchy bulb mucosal change', appearance: 'Patchy mosaic or cracked-mud appearance in the duodenal bulb.', interpretation: 'Mucosal injury that may support celiac suspicion; the appearance is not specific and normal appearance would not remove the biopsy indication.', action: 'Photograph. Obtain two supervised bulb samples under this case’s BSG profile. Keep them in a labeled bulb container, separate from D2 specimens.', biopsy: 'required', sampleCount: 2, sourceIds: ['bsg-celiac-2026', 'bsg-biopsy-2025', 'shah-scalloping-2000'] },
      { id: 'distal-fold-change', region: 'descending', clinicalRegion: 'second-duodenum', title: 'Scalloped or reduced distal folds', appearance: 'Scalloped folds and a mosaic pattern, with reduced folds in the intended teaching scene.', interpretation: 'Possible enteropathy, including celiac disease; correlate with histology and serology before diagnosis.', action: 'Photograph and obtain at least four supervised distal duodenal samples for this case. Label bulb and distal specimens separately according to the selected protocol.', biopsy: 'required', sampleCount: 4, sourceIds: ['acg-celiac-2023', 'bsg-biopsy-2025', 'shah-scalloping-2000'] },
    ],
    objectives: ['Describe duodenal changes without declaring confirmed celiac disease.', 'Review serology and gluten exposure before choosing samples.', 'Account for patchy disease by sampling bulb and distal duodenum.', 'Keep specimen sites clear and arrange pathology review.'],
    sourceIds: ['acg-celiac-2023', 'bsg-biopsy-2025', 'bsg-celiac-2026', 'shah-scalloping-2000'], meshCaseIds: ['celiac'],
  },
];

export const landmarks = [
  { id: 'proximal-esophagus', runtimeRegion: 'entry', title: 'Proximal esophagus', region: 'esophagus', description: 'Inspect proximal squamous lining and document a representative view.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
  { id: 'distal-esophagus', runtimeRegion: 'entry', title: 'Distal esophagus', region: 'esophagus', description: 'Inspect the distal tubular esophagus before conflating inflammation or columnar mucosa with a diagnosis.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
  { id: 'junctional-landmarks', runtimeRegion: 'cardia', title: 'Z-line and diaphragmatic indentation', region: 'junction', description: 'Identify the mucosal transition, proximal gastric folds and diaphragmatic pinch as distinct landmarks; they need not coincide.', photoRequired: true, sourceIds: ['esge-ugi-2025', 'acg-barrett-2022'] },
  { id: 'antrum', runtimeRegion: 'antrum', title: 'Gastric antrum', region: 'stomach', description: 'Inspect antral mucosa systematically, including the area approaching the pylorus.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
  { id: 'pylorus', runtimeRegion: 'pylorus', title: 'Pylorus', region: 'stomach', description: 'Identify the outlet between the antrum and duodenal bulb. It is an additional navigation checkpoint beyond the selected ten-photo standard.', photoRequired: false, sourceIds: ['esge-ugi-2025'] },
  { id: 'cardia-fundus', runtimeRegion: 'fundus', title: 'Cardia and fundus in retroflexion', region: 'stomach', description: 'Use a complete retroflexed survey, including mucosa partly hidden by the shaft. Release retroflexion before withdrawing into the esophagus.', photoRequired: true, sourceIds: ['esge-ugi-2025', 'bsg-ugi-2026'] },
  { id: 'lesser-curvature', runtimeRegion: 'body', title: 'Lesser curvature of the corpus', region: 'stomach', description: 'Document the lesser curvature with an appropriate partially inverted view in the selected ESGE photo protocol.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
  { id: 'incisura', runtimeRegion: 'antrum', title: 'Incisura / gastric angle', region: 'stomach', description: 'Inspect the angular notch with an appropriate partially inverted view.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
  { id: 'greater-curvature', runtimeRegion: 'body', title: 'Greater curvature of the corpus', region: 'stomach', description: 'Document a representative forward view of the greater curvature in the selected ESGE protocol.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
  { id: 'duodenal-bulb', runtimeRegion: 'bulb', title: 'Duodenal bulb', region: 'duodenum', description: 'Inspect the first part before passage causes contact changes that could mimic pathology.', photoRequired: true, sourceIds: ['esge-ugi-2025', 'bsg-ugi-2026'] },
  { id: 'second-duodenum', runtimeRegion: 'descending', title: 'Second part of the duodenum', region: 'duodenum', description: 'Identify and survey the second part, documenting representative mucosa and folds.', photoRequired: true, sourceIds: ['esge-ugi-2025'] },
];

export const trainingNotice = 'Educational simulation with fictional patients and illustrative anatomy. Synthetic scenes are not patient recordings, validated diagnostic examples or a substitute for supervised procedural training. Describe visible findings; confirm diagnoses using the appropriate clinical and pathology evidence.';
