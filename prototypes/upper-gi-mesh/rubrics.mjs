// Per-stop grading rubrics for the endoscopy proctor. Each stop maps to a
// Jev rubric: 3-5 scored points ("Nouls") plus optional safety flags.
// Medical content authored from standard upper-GI endoscopy technique;
// review by a surgeon (the project owner) is still pending.

export const RUBRICS = {
  entry: {
    context: 'Scope insertion at the oropharynx',
    points: [
      { id: 'entry-insuff', text: 'Gentle insufflation before advancing past the cricopharyngeus' },
      { id: 'entry-midline', text: 'Scope kept midline during insertion' },
    ],
    flags: [],
  },

  cardia: {
    context: 'Examination of the cardia / GEJ',
    points: [
      { id: 'cardia-insuff', text: 'Adequate insufflation before advancing (gas > 0.3)' },
      { id: 'cardia-orient', text: 'Scope oriented to visualise the Z-line / squamocolumnar junction' },
      { id: 'cardia-wash', text: 'Mucosa cleared with wash before inspection if fluid > 0.5' },
    ],
    flags: [
      { id: 'cardia-overinsuff', instructions: 'Dangerous over-insufflation (gas > 0.85 sustained > 3s)' },
    ],
  },

  fundus: {
    context: 'Examination of the gastric fundus',
    points: [
      { id: 'fundus-retro', text: 'Retroflexion performed to inspect the fundus' },
      { id: 'fundus-insuff', text: 'Adequate distension to flatten rugal folds' },
    ],
    flags: [],
  },

  body: {
    context: 'Examination of the gastric body',
    points: [
      { id: 'body-inspect', text: 'Systematic inspection of anterior and posterior walls' },
      { id: 'body-insuff', text: 'Maintained adequate insufflation during inspection' },
      { id: 'body-wash', text: 'Used wash to clear mucus or debris when present' },
    ],
    flags: [],
  },

  antrum: {
    context: 'Examination of the gastric antrum',
    points: [
      { id: 'antrum-inspect', text: 'Full visualization of the antrum including incisura' },
      { id: 'antrum-insuff', text: 'Adequate insufflation to flatten antral folds' },
    ],
    flags: [],
  },

  pylorus: {
    context: 'Passage through the pylorus',
    points: [
      { id: 'pylorus-wait', text: 'Waited for pylorus to open rather than forcing passage' },
      { id: 'pylorus-gentle', text: 'Gentle advancement through pyloric channel' },
    ],
    flags: [
      { id: 'pylorus-force', instructions: 'Forced the scope through a closed pylorus risking perforation' },
    ],
  },

  bulb: {
    context: 'Examination of the duodenal bulb',
    points: [
      { id: 'bulb-inspect', text: 'Full inspection of all walls of the duodenal bulb' },
      { id: 'bulb-insuff', text: 'Adequate insufflation of the bulb' },
    ],
    flags: [],
  },

  descending: {
    context: 'Examination of the second part of duodenum (D2)',
    points: [
      { id: 'd2-ampulla', text: 'Identified or attempted to visualise the major papilla' },
      { id: 'd2-inspect', text: 'Inspection of medial and lateral walls of D2' },
    ],
    flags: [],
  },
};
