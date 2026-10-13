import * as T from 'three';
import {deformGLSL} from '../prototypes/upper-gi-mesh/tissue.mjs';

/** Procedural material: no clinical photos are embedded or sampled. */
export function createSyntheticTissue(uniforms) {
  const m=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.37,metalness:0,clearcoat:.88,clearcoatRoughness:.19,side:T.DoubleSide});
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='attribute vec4 diseaseAppearance; varying vec4 diseaseView;\n'+deformGLSL+'\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','diseaseView=diseaseAppearance;tissuePosition=position;vec3 transformed=deformTissue(position);');
    shader.fragmentShader=`varying vec3 tissuePosition;varying vec4 diseaseView;
      float hashT(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noiseT(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hashT(i),hashT(i+vec3(1,0,0)),f.x),mix(hashT(i+vec3(0,1,0)),hashT(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashT(i+vec3(0,0,1)),hashT(i+vec3(1,0,1)),f.x),mix(hashT(i+vec3(0,1,1)),hashT(i+vec3(1,1,1)),f.x),f.y),f.z);}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=tissuePosition;
      float eso=smoothstep(3.9,5.2,p.y),duod=smoothstep(3.8,4.7,p.x);
      vec3 base=mix(vec3(.64,.255,.205),vec3(.72,.38,.35),eso);
      base=mix(base,vec3(.70,.40,.28),duod);
      float mottling=noiseT(p*7.8),fine=noiseT(p*66.);
      float vessels=pow(1.-abs(sin(p.y*13.+p.x*7.+noiseT(p*4.)*5.)),22.)*.09;
      base*=.89+.15*mottling+.035*fine;
      base=mix(base,vec3(.39,.10,.09),vessels);
      diffuseColor.rgb*=base;
      diffuseColor.rgb=mix(diffuseColor.rgb,diseaseView.rgb,diseaseView.a);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float micro=noiseT(tissuePosition*68.)*.0006+noiseT(tissuePosition*21.)*.0015;
      vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition),s0=cross(q1,normal),s1=cross(normal,q0);
      float det=dot(q0,s0);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(micro)*s0+dFdy(micro)*s1));
    `);
  };
  return m;
}
