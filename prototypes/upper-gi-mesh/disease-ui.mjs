import {cases,sources,companions,activeIds} from './disease-catalog.mjs';
export async function installDiseaseUI({changeCase,inspect,stop,modalClosed,preloadCase=()=>{}}){
 const q=s=>document.querySelector(s);
 const manifest=await fetch('./references/diseases/manifest.json').then(r=>{if(!r.ok)throw Error('Disease references unavailable');return r.json();});
 // Keep controls and status nodes alive; remove only obsolete explanatory UI.
 q('.brand').remove();document.title='Endoscopy simulator';
 q('.checkpoint').remove();q('.muted').remove();q('.map-note').remove();q('.boundary').remove();
 q('.panel-top').innerHTML='<span>Endoscopy</span><span id="active-case">Normal anatomy</span>';
 q('.location small').remove();q('#contact').hidden=true;q('.crosshair').remove();
 q('#reset').textContent='Reset';q('#wave').textContent='Peristalsis';q('#look-back').textContent='Look back';q('#references').textContent='Normal references';
 q('footer').innerHTML='<span>Illustrative simulation — not clinically validated</span>';
 document.querySelectorAll('.dot,.mint-dot,.panel-top i,.checkpoint i').forEach(el=>el.remove());
 for(const node of [...q('.scope-footer').childNodes])if(node.nodeType===3||node.nodeType===1&&!['mechanics','look-back'].includes(node.id))node.remove();
 q('.section-title span').textContent='Overview';
 const titles=[...document.querySelectorAll('.section-title')];titles[1].remove();titles[2].remove();q('.fluid-title').remove();
 document.querySelectorAll('[data-code]').forEach(b=>b.textContent=b.textContent.split(' · ').at(-1));
 q('.fluid-status label:last-child').hidden=true;
 q('header').insertAdjacentHTML('beforeend','<button id="shortcuts-button">Shortcuts</button><button id="settings-button">Settings</button>');
 document.body.insertAdjacentHTML('beforeend',`<dialog id="shortcuts-dialog" class="compact-dialog"><div class="reference-heading"><h2>Shortcuts</h2><button data-close>Close</button></div></dialog><dialog id="settings-dialog" class="compact-dialog"><div class="reference-heading"><h2>Settings</h2><button data-close>Close</button></div></dialog><dialog id="case-dialog"><div class="reference-heading"><h2 id="case-title">Case details</h2><button data-close>Close</button></div><p id="case-note"></p><div id="case-sources"></div><div id="case-images"></div><p>Supplied reference labels; synthetic 3D teaching appearances, not patient reconstructions. Histology and severity are not established by this simulation.</p></dialog>`);
 q('#shortcuts-dialog').append(q('dl'));
 q('#shortcuts-dialog dl').insertAdjacentHTML('beforeend','<div><dt><kbd>I</kbd></dt><dd>Insufflate</dd></div><div><dt><kbd>J</kbd></dt><dd>Irrigate</dd></div><div><dt><kbd>K</kbd></dt><dd>Suction</dd></div><div><dt><kbd>L</kbd></dt><dd>Lens wash</dd></div>');
 const speed=q('#travel-speed').closest('label');speed.className='speed-control';q('.scope-footer').prepend(speed);
 q('#settings-dialog').append(q('.options'));q('#settings-dialog').append(q('#references'));
 const region=document.createElement('select');region.id='region-select';region.setAttribute('aria-label','Go to region');
 for(const b of document.querySelectorAll('[data-landmark]')){const o=document.createElement('option');o.value=b.dataset.landmark;o.textContent=b.childNodes[1].textContent.trim();region.append(o);}
 const regionLabel=document.createElement('label');regionLabel.className='region-control';regionLabel.textContent='Region';regionLabel.append(region);q('#landmarks').before(regionLabel);q('#landmarks').hidden=true;
 region.onchange=()=>inspect(region.value);
 q('aside').insertAdjacentHTML('afterbegin',`<section class="case-picker"><label for="disease-select">Case library</label><select id="disease-select" aria-label="Disease case"></select><div class="case-actions"><button id="inspect-case">View finding</button><button id="case-details">Case details</button></div><label id="related-row" hidden><input id="related-case" type="checkbox"><span></span></label><p id="case-status" role="status"></p></section>`);
 for(const c of cases){const option=document.createElement('option');option.value=c.id;option.textContent=c.title;q('#disease-select').append(option);}
 const rail=document.createElement('aside');rail.className='disease-rail';rail.setAttribute('aria-label','Disease selector');q('main').prepend(rail);rail.append(q('.case-picker'));
 q('.case-picker>label').outerHTML='<h2 id="disease-heading">Cases</h2>';
 q('#disease-select').hidden=true;
 const buttons=document.createElement('div');buttons.id='disease-buttons';buttons.setAttribute('role','group');buttons.setAttribute('aria-labelledby','disease-heading');q('#disease-select').after(buttons);
 let hoverTimer;
 for(const c of cases){const b=document.createElement('button');b.type='button';b.textContent=c.title;b.dataset.case=c.id;b.setAttribute('aria-pressed',String(c.id==='normal'));b.onclick=()=>{if(q('#disease-select').value===c.id)return;q('#disease-select').value=c.id;q('#disease-select').onchange();};b.onpointerenter=()=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>preloadCase([c.id]),120);};b.onpointerleave=()=>clearTimeout(hoverTimer);b.onfocus=()=>preloadCase([c.id]);const row=document.createElement('div');row.className='disease-row';row.append(b);if(c.folders.length){const photo=document.createElement('button');photo.type='button';photo.className='case-photo';photo.setAttribute('aria-label','Real photos: '+c.title);photo.title='Real photos';photo.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></svg>';photo.onclick=()=>{updateDetails(c,false);open('#case-dialog');};row.append(photo);}buttons.append(row);}
 const open=id=>{stop();q(id).showModal();};
 q('#shortcuts-button').onclick=()=>open('#shortcuts-dialog');q('#settings-button').onclick=()=>open('#settings-dialog');
 for(const d of document.querySelectorAll('.compact-dialog,#case-dialog')){d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',modalClosed);}
 let current=cases[0];
 const updateDetails=(currentCase=current,includeRelated=true)=>{
  const current=currentCase;
  q('#case-title').textContent=current.title;q('#case-note').textContent=current.note;
  const enabled=includeRelated&&q('#related-case').checked&&current.related;
  const related=companions[current.related]||cases.find(c=>c.id===current.related);
  if(enabled)q('#case-note').textContent+=' Optional companion: '+related.title+'. '+related.note;
  q('#case-sources').replaceChildren();for(const key of new Set([...current.refs,...(enabled?related.refs:[])])){const [title,url]=sources[key],a=document.createElement('a');a.textContent=title;a.href=url;a.target='_blank';a.rel='noopener noreferrer';q('#case-sources').append(a);}
  q('#case-sources').insertAdjacentHTML('beforeend','<p class="photo-credit">Photo credits: most supplied photographs are from <a href="https://gastrolab.net/" target="_blank" rel="noopener noreferrer">GASTROLAB</a>, as identified by the contributor. Individual image authorship and reuse permissions have not been independently verified; copyright remains with the respective owners. Research references above describe the condition, not the provenance of every photograph.</p>');
  q('#case-images').replaceChildren();
  const folders=[...current.folders,...(enabled&&related.folders?related.folders:[])];
  for(const folder of manifest.filter(f=>folders.includes(f.id)))for(const ref of folder.images){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=ref.file;img.alt=folder.folder;img.loading='lazy';caption.textContent=folder.folder+' · '+ref.file.split('/').at(-1);figure.append(img,caption);q('#case-images').append(figure);}
 };
 let requestVersion=0;
 const apply=async()=>{
  const version=++requestVersion;
  stop();q('#related-case').disabled=true;q('#inspect-case').disabled=true;q('#case-details').disabled=true;q('#case-status').textContent='Loading view…';buttons.setAttribute('aria-busy','true');
  const next=cases.find(c=>c.id===q('#disease-select').value);
  for(const b of buttons.querySelectorAll('[data-case]'))b.setAttribute('aria-pressed',String(b.dataset.case===next.id));
  try{const applied=await changeCase(activeIds(next.id,q('#related-case').checked));if(version!==requestVersion||applied===false)return;current=next;q('#active-case').textContent=current.title;q('#case-status').textContent='';}
  catch(e){if(version!==requestVersion)return;q('#case-status').textContent='Could not load this case. Previous view retained.';q('#disease-select').value=current.id;q('#related-case').checked=false;const related=companions[current.related]||cases.find(c=>c.id===current.related);q('#related-row').hidden=!related;q('#related-row span').textContent=related?'Add '+related.title:'';console.error(e);}
  finally{if(version===requestVersion){q('#related-case').disabled=false;q('#inspect-case').disabled=false;q('#case-details').disabled=false;buttons.setAttribute('aria-busy','false');for(const b of buttons.querySelectorAll('[data-case]'))b.setAttribute('aria-pressed',String(b.dataset.case===current.id));}}
 };
 q('#disease-select').onchange=()=>{
  q('#related-case').checked=false;const next=cases.find(c=>c.id===q('#disease-select').value),related=companions[next.related]||cases.find(c=>c.id===next.related);
  q('#related-row').hidden=!related;q('#related-row span').textContent=related?'Add '+related.title:'';apply();
 };
 q('#related-case').onchange=apply;q('#case-details').onclick=()=>{updateDetails();open('#case-dialog');};
 q('#inspect-case').onclick=()=>{inspect(current.region,current.id);region.value=current.region;};
 // Reference images and descriptions are prepared only when details open.
 return {presentCase(id){
  requestVersion++;current=cases.find(c=>c.id===id);q('#disease-select').value=id;q('#active-case').textContent=current.title;q('#related-case').checked=false;
  const related=companions[current.related]||cases.find(c=>c.id===current.related);q('#related-row').hidden=!related;q('#related-row span').textContent=related?'Add '+related.title:'';
  q('#case-status').textContent='';buttons.setAttribute('aria-busy','false');q('#inspect-case').disabled=false;q('#case-details').disabled=false;q('#related-case').disabled=false;
  for(const b of buttons.querySelectorAll('[data-case]'))b.setAttribute('aria-pressed',String(b.dataset.case===id));
 }};
}
