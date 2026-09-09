import * as T from 'three';
import {field} from './anatomy.mjs';

const smooth=(a,b,x)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function tissueField(x,y,z){
  const eso=smooth(4,5.2,y), outlet=smooth(3.4,4.5,x);
  const angle=Math.atan2(z,x+1.5);
  // Spatially varying, branching longitudinal gastric rugae; no painted shadows.
  const phase=angle*9+y*1.15+1.15*Math.sin(y*1.45+angle*2)+.28*Math.sin(y*4.1-angle*5);
  const ridges=Math.pow(.5+.5*Math.sin(phase),2);
  const body=(1-eso)*(1-outlet)*(1-smooth(.3,3.5,x));
  // Broad rounded crests, faded at the polar axis: the old angular field
  // formed pinched spokes where atan2 becomes undefined.
  const axisFade=smooth(.35,1.15,Math.hypot(x+1.5,z));
  const gastric=.19*ridges*body*axisFade*(.72+.28*Math.sin(y*1.7+angle));
  const esophageal=.10*eso*Math.pow(.5+.5*Math.cos(3*Math.atan2(z,x-.15)+y*.48),3);
  const duodenal=.10*outlet*Math.pow(.5+.5*Math.sin(y*8.5+x*2+.3*Math.sin(z*4)),4);
  return field(x,y,z)+gastric+esophageal+duodenal;
}

// Timing envelope interpreted from the supplied 21.323 s clip. It is NOT a
// calibrated pressure waveform or measured propagation speed (camera moves).
export function deformation(y,time,gas){
  const eso=smooth(4.1,5.3,y);
  const phase=((time+(6-y)*.7)%21.323+21.323)%21.323;
  const close=smooth(8,12,phase)*(1-smooth(17,21.323,phase));
  const breathing=.008*Math.sin(time*1.25);
  return {center:T.MathUtils.lerp(-1,.15,eso), scale:1+gas*.20+breathing-eso*(.08+.48*close)};
}
export function dynamicField(x,y,z,time,gas){
  z/=collapseScale(gas);
  const a=antralScale(x,time,gas),qy=-2.3+(y+2.3)/a,qz=z/a;
  const d=deformation(qy,time,gas);
  return tissueField(d.center+(x-d.center)/d.scale,qy,qz/d.scale)*Math.min(a,d.scale)*collapseScale(gas);
}
// Apposed walls leave a narrow slit, with space for the instrument. This is
// illustrative distension, not a calibrated pressure/compliance model.
export function collapseScale(gas){return .30+.70*smooth(0,.75,gas);}
// Sequential invertible regional mapping, shared with the vertex shader. The
// clips show a travelling antral ring and a separately puckering pylorus.
export function antralScale(x,time,gas){
 const phase=((time%24)+24)%24;
 const envelope=smooth(7,11,phase)*(1-smooth(18,23,phase));
 const center=.7+(phase-7)*.29;
 const wave=Math.exp(-Math.pow((x-center)/.85,2))*envelope*smooth(.25,1.25,x)*(1-smooth(3.65,4.2,x));
 const pyloricPhase=((time%20)+20)%20;
 const ring=smooth(1,3.5,pyloricPhase)*(1-smooth(4.5,7,pyloricPhase))*Math.exp(-Math.pow((x-3.45)/.36,2));
 return Math.max(.40,1-.48*wave-.44*ring+gas*.06*smooth(.6,1.4,x)*(1-smooth(3.4,4.1,x)));
}
export function deformPoint(x,y,z,time,gas){
 const d=deformation(y,time,gas),px=d.center+(x-d.center)*d.scale;
 const a=antralScale(px,time,gas);return [px,-2.3+(y+2.3)*a,z*d.scale*a*collapseScale(gas)];
}
export function moveDynamic(position,direction,distance,time,gas){
  const n=Math.max(1,Math.ceil(Math.abs(distance)/.025));
  const step=direction.clone().multiplyScalar(distance/n),next=new T.Vector3();
  for(let i=0;i<n;i++){
    next.copy(position).add(step);
    if(dynamicField(next.x,next.y,next.z,time,gas)>-.10)return true;
    position.copy(next);
  }
  return false;
}
export function updateFluids(state,dt,input){
  state.gas=T.MathUtils.clamp(state.gas+dt*(input.air*.28-input.suction*.36-.002),0,1);
  state.fluid=T.MathUtils.clamp(state.fluid+dt*(input.water*.14-input.suction*.24),0,1);
  state.lens=T.MathUtils.clamp(state.lens+dt*(input.water*.12-input.wash*.95-.018),0,.65);
  return state;
}

export const deformGLSL=`
uniform float simTime; uniform float gas;
varying vec3 tissuePosition;
vec3 deformTissue(vec3 p){
 float eso=smoothstep(4.1,5.3,p.y);
 float phase=mod(simTime+(6.-p.y)*.7,21.323);
 float closure=smoothstep(8.,12.,phase)*(1.-smoothstep(17.,21.323,phase));
 float s=1.+gas*.20+.008*sin(simTime*1.25)-eso*(.08+.48*closure);
 float c=mix(-1.,.15,eso);p.x=c+(p.x-c)*s;p.z*=s;
 float ap=mod(simTime,24.);
 float envelope=smoothstep(7.,11.,ap)*(1.-smoothstep(18.,23.,ap));
 float center=.7+(ap-7.)*.29;
 float wave=exp(-pow((p.x-center)/.85,2.))*envelope*smoothstep(.25,1.25,p.x)*(1.-smoothstep(3.65,4.2,p.x));
 float pp=mod(simTime,20.);
 float ring=smoothstep(1.,3.5,pp)*(1.-smoothstep(4.5,7.,pp))*exp(-pow((p.x-3.45)/.36,2.));
 float a=max(.40,1.-.48*wave-.44*ring+gas*.06*smoothstep(.6,1.4,p.x)*(1.-smoothstep(3.4,4.1,p.x)));
 p.y=-2.3+(p.y+2.3)*a;p.z*=a*(.30+.70*smoothstep(0.,.75,gas));return p;
}`;

export async function createTissueMaterial(uniforms){
  // Small tissue-only crops exclude scope borders, lumen holes and captions.
  const regions=[
    ['Esophagus.jpg',[.58,.34,.20,.24]],
    ['Gastric body, corpus.jpg',[.13,.62,.08,.10]],
    ['pylorus.jpg',[.43,.65,.22,.18]],
    ['The duodenal bulb (bulbus duodeni) 1.jpg',[.32,.28,.19,.22]],
  ];
  const textures=await Promise.all(regions.map(async([name,crop])=>{
    const img=new Image();img.src=new URL('./references/'+encodeURIComponent(name),import.meta.url).href;
    await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,crop[0]*img.width,crop[1]*img.height,crop[2]*img.width,crop[3]*img.height,0,0,256,256);
    // Mirror edges into a seamless tile. Compress baked lighting rather than
    // allowing a photographic highlight to masquerade as dynamic reflection.
    const data=ctx.getImageData(0,0,256,256),copy=new Uint8ClampedArray(data.data);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const sx=x<128?x*2:510-x*2,sy=y<128?y*2:510-y*2,src=(sy*256+sx)*4,dst=(y*256+x)*4;
      const lum=(copy[src]+copy[src+1]+copy[src+2])/3;
      const correction=150/Math.max(65,lum);
      for(let c=0;c<3;c++)data.data[dst+c]=Math.min(235,copy[src+c]*(.65+.35*correction));
    }
    ctx.putImageData(data,0,0);const tex=new T.CanvasTexture(canvas);
    tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
  }));
  const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.40,metalness:0,clearcoat:.65,clearcoatRoughness:.28,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms,{esoTex:{value:textures[0]},bodyTex:{value:textures[1]},antrumTex:{value:textures[2]},bulbTex:{value:textures[3]}});
    shader.vertexShader='attribute vec4 diseaseAppearance; varying vec4 diseaseView;\n'+deformGLSL+'\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','diseaseView=diseaseAppearance;tissuePosition=position; vec3 transformed=deformTissue(position);');
    shader.fragmentShader=`varying vec3 tissuePosition; varying vec4 diseaseView;
      uniform sampler2D esoTex;uniform sampler2D bodyTex;uniform sampler2D antrumTex;uniform sampler2D bulbTex;
      float hash3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
      vec3 tissueSample(sampler2D tex,vec3 p,vec3 w){return texture2D(tex,p.yz*1.7).rgb*w.x+texture2D(tex,p.xz*1.7).rgb*w.y+texture2D(tex,p.xy*1.7).rgb*w.z;}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=tissuePosition;vec3 w=abs(normalize(cross(dFdx(p),dFdy(p))));w=pow(w,vec3(4.));w/=max(.001,w.x+w.y+w.z);
      float eso=smoothstep(3.8,5.1,p.y),antrum=smoothstep(-.4,2.5,p.x),bulb=smoothstep(3.7,4.7,p.x);
      vec3 albedo=mix(tissueSample(bodyTex,p,w),tissueSample(antrumTex,p,w),antrum);
      albedo=mix(albedo,tissueSample(esoTex,p,w),eso);albedo=mix(albedo,tissueSample(bulbTex,p,w),bulb);
      float grain=noise3(p*75.);float mottling=noise3(p*6.);
      // Suppress lighting baked into the photos. Regional colour remains
      // photo-derived; small variations no longer resemble tiled dark cracks.
      vec3 regional=mix(vec3(.52,.20,.145),vec3(.57,.28,.25),eso);
      regional=mix(regional,vec3(.54,.29,.15),bulb);
      albedo=mix(regional,albedo,.32);
      diffuseColor.rgb*=albedo*(.94+.08*mottling+.025*grain);
      diffuseColor.rgb=mix(diffuseColor.rgb,diseaseView.rgb,diseaseView.a);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float micro=noise3(tissuePosition*65.)*.0011+noise3(tissuePosition*19.)*.0022;
      vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition);
      vec3 s0=cross(q1,normal),s1=cross(normal,q0);
      float det=dot(q0,s0);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(micro)*s0+dFdy(micro)*s1));
    `);
  };
  return material;
}
