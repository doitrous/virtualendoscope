// Reviewed 2026-09-09. Folder labels are supplied labels, not verified histology.
const pmc=id=>`https://pmc.ncbi.nlm.nih.gov/articles/${id}/`;
const nid=path=>`https://www.niddk.nih.gov/health-information/digestive-diseases/${path}`;
export const sources={
 reflux:['LA grading study',pmc('PMC7089865')],hernia:['NIDDK: GERD causes',nid('acid-reflux-ger-gerd-adults/symptoms-causes')],
 benign:['Benign oesophageal lesions',pmc('PMC4306152')],inlet:['Inlet patch review',pmc('PMC6700698')],diverticulum:['Oesophageal diverticula review',pmc('PMC9992562')],
 crohn:['Oesophageal Crohn case',pmc('PMC5256588')],cancer:['Squamous neoplasia review',pmc('PMC11164272')],
 varices:['WGO: oesophageal varices','https://www.worldgastroenterology.org/UserFiles/file/guidelines/esophageal-varices-english-2014.pdf'],
 gastritis:['NIDDK: gastritis and gastropathy',nid('gastritis-gastropathy/definition-facts')],ulcer:['NIDDK: peptic ulcer causes',nid('peptic-ulcers-stomach-ulcers/symptoms-causes')],
 polyps:['BSG gastric guideline',pmc('PMC6709778')],sel:['ASGE: subepithelial lesions','https://www.asge.org/home/resources/publications/guidelines/the-role-of-endoscopy-in-subepithelial-lesions-of-the-gi-tract'],
 celiac:['Duodenal endoscopic markers',pmc('PMC6344298')],bulbpolyps:['Duodenal hyperplastic polyps',pmc('PMC1860533')],
 metaplasia:['Gastric metaplasia in duodenal bulb','https://onlinelibrary.wiley.com/doi/full/10.1046/j.1440-1746.2001.02448.x'],
 papilla:['Papillary morphology study',pmc('PMC7356786')],fap:['ASGE: FAP','https://www.asge.org/home/resources/publications/guidelines/familial-adenomatous']
};
// id, title, region, supplied folders, visual explanation, source keys, optional related case.
export const cases=[
 ['normal','Normal anatomy','entry',[],'Normal reference-guided anatomy.',['papilla']],
 ['reflux-b','Reflux oesophagitis · LA B','cardia',['22'],'Separate distal mucosal breaks; no bridging between fold tops. Scale is illustrative.',['reflux','hernia'],'hernia'],
 ['reflux-d','Reflux oesophagitis · LA D','cardia',['23'],'Extensive confluent distal injury spanning at least 75% of the circumference.',['reflux','hernia'],'hernia'],
 ['varices','Oesophageal varices','entry',['18'],'Tortuous submucosal columns. Portal hypertensive gastropathy is an optional companion, not inevitable.',['varices'],'portal-gastropathy'],
 ['inlet','Inlet patch','entry',['17'],'Salmon-coloured island in the proximal oesophagus; distinct from distal Barrett mucosa.',['inlet','benign']],
 ['acanthosis','Glycogenic acanthosis','entry',['21'],'Small pale raised plaques, usually an incidental benign finding.',['benign']],
 ['diverticulum','Oesophageal diverticulum','entry',['16','20'],'Lateral pouch beside the true lumen; the guided route stays in the true lumen.',['diverticulum']],
 ['crohn','Oesophageal Crohn’s disease','entry',['14'],'Patchy aphthous and deeper ulcers. Gastric involvement is not assumed.',['crohn']],
 ['cancer','Oesophageal squamous cancer','entry',['01'],'Irregular ulcerated mass. Non-obstructing teaching variant of the supplied advanced lesion; biopsy and staging cannot be inferred from this view.',['cancer']],
 ['hernia','Hiatal hernia','cardia',['06','13'],'Illustrative widened junction and supradiaphragmatic pouch, not a measured hernia.',['hernia'],'reflux-b'],
 ['hernia-polyps','Hiatal hernia + gastric polyps','fundus',['04'],'Combination depicted in the supplied folder; not a claimed causal association.',['hernia','polyps']],
 ['alcohol','Alcohol-associated gastropathy','body',['05'],'Erythema and erosions. Alcohol can cause erosive gastropathy; appearance alone does not establish the cause.',['gastritis']],
 ['gastric-polyps','Gastric hyperplastic polyps','body',['10'],'Small smooth reddish mounds. Histology distinguishes hyperplastic from other polyp types.',['polyps'],'hp-gastritis'],
 ['gist','Gastric GIST','body',['11'],'Smooth subepithelial bulge with preserved covering mucosa. GIST cannot be confirmed by surface appearance alone.',['sel']],
 ['celiac','Coeliac disease','bulb',['03','08'],'Patchy bulb and distal duodenal mosaic, scalloping and reduced folds. Serology and biopsy are needed; normal appearance does not exclude disease.',['celiac']],
 ['duodenal-ulcer','Duodenal ulcer','bulb',['15'],'Pale ulcer bed with an erythematous rim. Optional H. pylori-associated gastric changes represent one possible aetiology.',['ulcer','gastritis'],'hp-gastritis'],
 ['bulb-polyps','Duodenal hyperplastic polyps','bulb',['07'],'Small pale mucosal elevations; uncommon and histology-dependent.',['bulbpolyps']],
 ['metaplasia','Duodenal gastric metaplasia','bulb',['19'],'A nodular teaching variant. Many cases look normal and require biopsy. This is not gastric intestinal metaplasia.',['metaplasia']],
 ['duodenal-sel','Duodenal subepithelial lesion','descending',['02'],'Smooth covered bulge; benignity and tissue type are supplied labels, not optical diagnoses.',['sel']],
 ['fap','Duodenal adenoma · FAP','descending',['12'],'Lobulated sessile adenomatous elevations. Inspect the periampullary region as well; no automatic conversion to gastric hyperplastic polyps.',['fap']],
].map(([id,title,region,folders,note,refs,related])=>({id,title,region,folders,note,refs,related}));
export const companions={
 'portal-gastropathy':{title:'Portal hypertensive gastropathy',note:'Possible companion of portal hypertension; not present in every patient.',refs:['varices']},
 'hp-gastritis':{title:'H. pylori-associated gastritis',note:'Possible shared background, not a diagnosis from redness. Not the alcohol-associated case.',refs:['gastritis','ulcer']}
};
export function activeIds(id,related=false){const item=cases.find(c=>c.id===id);if(!item)throw Error('Unknown case');return [id,...(related&&item.related?[item.related]:[])];}
