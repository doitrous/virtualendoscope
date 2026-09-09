// Curated visible findings, travelling proximal to distal. Less conspicuous
// inlet patch, acanthosis, diverticulum and metaplasia are deliberately omitted.
export const tourDuration=53;
export const tourStages=[
 [0,'normal',0,0,'Watch the normal oesophageal peristaltic wave'],
 [3,'varices',0,.045,'Raised, winding venous columns'],
 [6,'reflux-b',.045,.075,'Separate distal mucosal breaks'],
 [9,'reflux-d',.075,.105,'Extensive confluent mucosal injury'],
 [12,'hernia-polyps',.105,.33,'Hernia with coexisting gastric polyps'],
 [19,'alcohol',.33,.40,'Gastric erythema and erosions'],
 [23,'gist',.40,.45,'Smooth subepithelial gastric bulge'],
 [27,'gastric-polyps',.45,.56,'Small raised gastric polyps'],
 [31,'gastric-polyps',.56,.79,'Continuing through the antrum to the pylorus'],
 [37,'duodenal-ulcer',.79,.82,'Pale ulcer bed with an inflamed rim'],
 [41,'bulb-polyps',.82,.85,'Small duodenal bulb elevations'],
 [44,'celiac',.85,.90,'Mosaic mucosa and altered duodenal folds'],
 [47,'duodenal-sel',.90,.935,'Smooth covered duodenal bulge'],
 [50,'fap',.935,.985,'Lobulated duodenal adenomatous elevations']
].map(([time,id,from,to,caption])=>({time,id,from,to,caption}));
export function tourAt(seconds){
 const t=Math.max(0,Math.min(tourDuration,seconds));let index=tourStages.length-1;
 while(index>0&&tourStages[index].time>t)index--;
 const stage=tourStages[index],end=tourStages[index+1]?.time??tourDuration;
 // Monotone Hermite interpolation keeps both position and speed continuous
 // across case changes without overshooting into a different region.
 const slope=i=>{const s=tourStages[i];return (s.to-s.from)/((tourStages[i+1]?.time??tourDuration)-s.time);};
 const blend=(a,b)=>a>0&&b>0?2*a*b/(a+b):0;
 const duration=end-stage.time,u=(t-stage.time)/duration,v=slope(index);
 const m0=index?blend(slope(index-1),v):0,m1=index+1<tourStages.length?blend(v,slope(index+1)):0;
 const progress=(2*u**3-3*u*u+1)*stage.from+(u**3-2*u*u+u)*duration*m0+(-2*u**3+3*u*u)*stage.to+(u**3-u*u)*duration*m1;
 return {index,stage,progress,done:t>=tourDuration};
}
export class Walkthrough{
 constructor({prepare,begin,resume=()=>{},show,move,finish,button,banner}){Object.assign(this,{prepare,begin,resume,show,move,finish,button,banner});this.active=false;this.suspended=false;this.preparing=false;this.version=0;this.elapsed=0;this.index=-1;button.onclick=()=>this.active||this.preparing?this.stop():this.suspended?this.continue():this.start();}
 continue(){if(!this.suspended)return;this.suspended=false;this.active=true;this.resume();this.index=-1;this.update(0);}
 async start(){
  const version=++this.version;this.suspended=false;this.notice=0;this.preparing=true;this.button.textContent='Cancel loading';this.banner.hidden=false;this.banner.textContent='Preparing walkthrough…';
  try{await this.prepare(version);if(version!==this.version)return;this.preparing=false;this.active=true;this.elapsed=0;this.index=-1;this.begin();this.button.textContent='Stop walkthrough';this.update(0);}
  catch(e){if(version!==this.version)return;this.stop();this.banner.hidden=false;this.banner.textContent='Walkthrough could not load. Please try again.';console.error(e);}
 }
 update(dt){if(!this.active){if(this.notice>0){this.notice-=Math.min(dt,.05);if(this.notice<=0)this.banner.hidden=true;}return;}this.elapsed+=Math.min(Math.max(dt,0),.05);const state=tourAt(this.elapsed);
  if(state.index!==this.index){this.index=state.index;this.show(state.stage);this.banner.hidden=false;}
  this.banner.hidden=this.elapsed-state.stage.time>3.4;
  this.move(state,dt);this.button.textContent='Pause walkthrough';
  if(state.done){this.stop(false);this.banner.hidden=false;this.banner.textContent='Walkthrough complete';this.notice=3.5;}
 }
 stop(preserve=true){if(!this.active&&!this.preparing)return;this.suspended=preserve&&this.active;this.version++;this.active=false;this.preparing=false;this.button.textContent=this.suspended?'Resume walkthrough':'Start walkthrough';this.banner.hidden=true;this.finish(this.suspended);}
}
