import {tissueField} from './tissue.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const sphere=(p,c,r)=>Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2])-r;
const smin=(a,b,k=.08)=>{const h=clamp(.5+.5*(b-a)/k);return b*(1-h)+a*h-k*h*(1-h);};
export function wallPoint(center,angle){
 const d=[Math.cos(angle),0,Math.sin(angle)];let lo=0,hi=.025;
 while(tissueField(center[0]+d[0]*hi,center[1],center[2]+d[2]*hi)<0&&hi<8)hi+=.025;
 for(let i=0;i<14;i++){const m=(lo+hi)/2;if(tissueField(center[0]+d[0]*m,center[1],center[2]+d[2]*m)<0)lo=m;else hi=m;}
 return [center[0]+d[0]*hi,center[1],center[2]+d[2]*hi];
}
export function createDiseaseModel(ids=['normal']){
 const enabled=new Set(ids),nodules=[],pockets=[];
 const has=id=>enabled.has(id);
 const add=(center,angle,r,color=[.65,.25,.19],type='mound')=>{
  const p=wallPoint(center,angle);(type==='pocket'?pockets:nodules).push({p,r,color});
 };
 if(has('acanthosis'))for(let i=0;i<34;i++)add([.15,4.4+(i%9)*.22,0],i*2.4,.035,[.74,.65,.57]);
 if(has('varices'))for(let j=0;j<4;j++)for(let i=0;i<42;i++)add([.15,4.05+i*.055,0],j*Math.PI/2+.14*Math.sin(i*.25+j),.09,[.29,.25,.34]);
 if(has('cancer'))for(let i=0;i<18;i++)add([.15,4.55+(i%6)*.1,0],.4+Math.floor(i/6)*.45,.11+.03*Math.sin(i),[.55,.15,.15]);
 if(has('gastric-polyps')||has('hernia-polyps'))for(let i=0;i<9;i++)add([-1.7,has('hernia-polyps')?2.4+(i%3)*.22:-.7+(i%4)*.5,0],i*2.4,.11,[.68,.25,.19]);
 if(has('gist'))add([-1.7,.1,0],1.1,.42,[.64,.32,.23]);
 if(has('duodenal-sel'))add([5,-3.7,0],1.1,.16,[.65,.35,.22]);
 if(has('fap'))for(let i=0;i<7;i++)add([5,-3.4-(i%3)*.16,0],.7+i*.31,.09,[.71,.43,.29]);
 if(has('bulb-polyps')||has('metaplasia'))for(let i=0;i<12;i++)add([4.5,-2.2+(i%3)*.06,0],i*2.4,has('metaplasia')?.045:.075,[.72,.43,.29]);
 if(has('papilla'))add([5,-3.65,0],Math.PI,.11,[.65,.32,.22]);
 if(has('duodenal-ulcer'))add([4.5,-2.2,0],1.05,.18,[0,0,0],'pocket');
 if(has('diverticulum'))add([.15,5.1,0],.45,.30,[0,0,0],'pocket');
 if(has('hernia')||has('hernia-polyps'))add([.08,3.8,0],2.7,.48,[0,0,0],'pocket');
 const bins=new Map();for(const n of nodules)for(let b=Math.floor((n.p[1]-n.r-.1)*10);b<=Math.ceil((n.p[1]+n.r+.1)*10);b++){if(!bins.has(b))bins.set(b,[]);bins.get(b).push(n);}
 const field=(x,y,z)=>{
  let f=tissueField(x,y,z);const p=[x,y,z];
  if(has('celiac')&&x>3.4){const outlet=smooth(3.4,4.5,x),fold=.10*outlet*Math.pow(.5+.5*Math.sin(y*8.5+x*2+.3*Math.sin(z*4)),4);f-=fold*.65;f+=.025*outlet*Math.sin(z*19+x*11)*Math.pow(.5+.5*Math.sin(y*8.5+x*2),4);}
  for(const n of bins.get(Math.floor(y*10))||[])f=-smin(-f,sphere(p,n.p,n.r),.035);
  for(const n of pockets)if(Math.abs(y-n.p[1])<n.r+.1)f=smin(f,sphere(p,n.p,n.r),.08);
  return f;
 };
 const appearance=(x,y,z)=>{
  let color=[0,0,0],strength=0;
  const paint=(c,s)=>{s=clamp(s);if(s>strength){color=c;strength=s;}};
  const theta=Math.atan2(z,x-.15),eso=smooth(3.8,4.15,y)*(1-smooth(6.6,6.9,y));
  const distal=smooth(3.75,4.0,y)*(1-smooth(4.75,5.05,y));
  const grain=.5+.5*Math.sin(x*53+y*37+Math.sin(z*41));
  const stomach=(1-smooth(3.4,4.1,y))*(1-smooth(2.9,3.7,x));
  const bulb=smooth(3.8,4.2,x)*(1-smooth(4.7,5.1,x))*(1-smooth(.3,.8,Math.abs(y+2.2)));
  if(has('reflux-b')){const strip=Math.pow(.5+.5*Math.cos(theta*3+.12*Math.sin(y*13)),22);paint([.60,.065,.055],distal*strip);paint([.8,.62,.40],distal*strip*smooth(.7,1,grain)*.7);}
  if(has('reflux-d')){const confluent=.9+.1*Math.sin(theta*3+y*14);paint([.58,.07,.06],distal*confluent);paint([.83,.66,.46],distal*smooth(.30,.55,grain));}
  if(has('inlet'))paint([.64,.19,.12],smooth(.4,.65,Math.cos(theta-.5))*(1-smooth(.3,.48,Math.abs(y-6.1))));
  if(has('crohn'))for(let i=0;i<6;i++){const e=((y-(4.3+i*.33))/.12)**2+((Math.sin(theta-i*2.4))/.25)**2;paint(e<.45?[.79,.67,.43]:[.55,.09,.07],eso*(1-smooth(.7,1,e)));}
  if(has('cancer'))paint([.80,.65,.43],eso*(1-smooth(.3,.55,Math.abs(y-4.8)))*smooth(.72,.95,grain)*smooth(.3,.7,Math.cos(theta-.8)));
  if(has('alcohol')||has('hp-gastritis')){paint([.61,.13,.09],stomach*(.30+.40*grain));if(has('alcohol'))paint([.41,.04,.03],stomach*smooth(.94,1,grain)*(.5+.5*Math.sin(y*7)));}
  if(has('portal-gastropathy')){const mosaic=Math.abs(Math.sin(x*9+Math.sin(y*3))*Math.sin(y*10+z*4));paint([.66,.17,.14],stomach*(1-smooth(.05,.22,mosaic))*.8);}
  if(has('celiac')){const duod=smooth(3.8,4.3,x);const mosaic=Math.abs(Math.sin(y*18+Math.sin(z*11))*Math.sin(z*16+x*8));paint([.67,.28,.15],duod*(1-smooth(.02,.20,mosaic))*.8);}
  if(has('duodenal-ulcer')){const c=pockets[0].p,e=Math.hypot(x-c[0],y-c[1],z-c[2])/.26;paint(e<.8?[.84,.74,.49]:[.55,.08,.055],1-smooth(.9,1,e));}
  for(const n of nodules){const d=Math.hypot(x-n.p[0],y-n.p[1],z-n.p[2]);paint(n.color,1-smooth(n.r*.9,n.r*1.35,d));}
  return [...color,strength];
 };
 return {ids,field,appearance,nodules,pockets};
}
export function colorDiseaseGeometry(geometry,model,T){
 const p=geometry.attributes.position,array=new Float32Array(p.count*4);
 for(let i=0;i<p.count;i++)array.set(model.appearance(p.getX(i),p.getY(i),p.getZ(i)),i*4);
 geometry.setAttribute('diseaseAppearance',new T.BufferAttribute(array,4));return geometry;
}
