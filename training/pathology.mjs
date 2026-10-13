import { createDiseaseModel, wallPoint } from '../prototypes/upper-gi-mesh/disease-model.mjs';

/** Synthetic additions, not patient reconstructions or validated diagnostic imagery. */
export function createTrainingPathology(id = 'normal') {
  const base = createDiseaseModel(['barrett','gastric-ulcer'].includes(id) ? ['normal'] : [id]);
  const centre = wallPoint([1.1, -2.4, 0], 1.05);
  const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t); };
  return { ...base, ids:[id], centre,
    field(x,y,z) {
      const d=base.field(x,y,z);
      if(id!=='gastric-ulcer') return d;
      const pocket=Math.hypot(x-centre[0],y-centre[1],z-centre[2])-.25;
      const h=Math.max(.06-Math.abs(d-pocket),0)/.06;
      return Math.min(d,pocket)-h*h*.06*.25;
    },
    appearance(x,y,z) {
      if(id==='barrett') {
        const theta=Math.atan2(z,x-.15),upper=4.25+.42*Math.pow(.5+.5*Math.cos(theta*3),2);
        const mask=smooth(3.6,3.95,y)*(1-smooth(upper-.06,upper+.08,y));
        return [.67,.25,.17,mask*.9];
      }
      if(id==='gastric-ulcer') {
        const d=Math.hypot(x-centre[0],y-centre[1],z-centre[2]);
        const color=d<.23?[.79,.68,.48]:[.54,.08,.06];
        return [...color,1-smooth(.29,.35,d)];
      }
      return base.appearance(x,y,z);
    },
  };
}
