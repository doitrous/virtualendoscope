import * as T from 'three';
import {deformGLSL} from '../prototypes/upper-gi-mesh/tissue.mjs';

/** Generated diffuse reference; no clinical photo pixels. See MUCOSA-VISUAL-PROVENANCE.md. */
export async function createSyntheticTissue(uniforms) {
  const texture=await new T.TextureLoader().loadAsync(new URL('./assets/gastric-mucosa-v2.png',import.meta.url).href);
  texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;
  texture.anisotropy=4;
  const material=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.43,metalness:0,clearcoat:.46,clearcoatRoughness:.23,ior:1.38,side:T.DoubleSide});
  material.addEventListener('dispose',()=>texture.dispose());
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms,{mucosaMap:{value:texture}});
    shader.vertexShader='attribute vec4 diseaseAppearance; varying vec4 diseaseView; varying vec3 restingNormal;\n'+deformGLSL+'\n'+shader.vertexShader;
    // Distension/peristalsis must also deform normals, or moving folds retain stale highlights.
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
      vec3 n=normalize(normal);
      vec3 t=normalize(cross(n,abs(n.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.)));
      vec3 b=cross(n,t);
      vec3 dt=deformTissue(position+t*.006)-deformTissue(position-t*.006);
      vec3 db=deformTissue(position+b*.006)-deformTissue(position-b*.006);
      vec3 objectNormal=normalize(cross(dt,db));
      restingNormal=n;
    `);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','diseaseView=diseaseAppearance;tissuePosition=position;vec3 transformed=deformTissue(position);');
    shader.fragmentShader=`varying vec3 tissuePosition;varying vec4 diseaseView;varying vec3 restingNormal;
      uniform sampler2D mucosaMap;uniform float pathologyKind;uniform vec3 ulcerCentre;
      float hashT(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noiseT(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hashT(i),hashT(i+vec3(1,0,0)),f.x),mix(hashT(i+vec3(0,1,0)),hashT(i+vec3(1,1,0)),f.x),f.y),mix(mix(hashT(i+vec3(0,0,1)),hashT(i+vec3(1,0,1)),f.x),mix(hashT(i+vec3(0,1,1)),hashT(i+vec3(1,1,1)),f.x),f.y),f.z);}
      vec3 mucosaSample(vec3 p,vec3 w){return texture2D(mucosaMap,p.yz*.46).rgb*w.x+texture2D(mucosaMap,p.xz*.46+vec2(.37,.16)).rgb*w.y+texture2D(mucosaMap,p.xy*.46+vec2(.13,.61)).rgb*w.z;}
      `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 p=tissuePosition;
      vec3 w=pow(abs(normalize(restingNormal)),vec3(5.));w/=max(.001,w.x+w.y+w.z);
      float eso=smoothstep(3.9,5.2,p.y),duod=smoothstep(3.8,4.7,p.x);
      vec3 reference=mucosaSample(p,w);
      vec3 regional=mix(vec3(.57,.22,.17),vec3(.65,.33,.30),eso);
      regional=mix(regional,vec3(.64,.35,.22),duod);
      float mottling=noiseT(p*3.8),fine=noiseT(p*66.);
      vec3 base=mix(regional,reference,.43*(1.-eso*.48));
      base*=.94+.085*mottling+.015*fine;
      diffuseColor.rgb*=base;
      if(pathologyKind<.5) diffuseColor.rgb=mix(diffuseColor.rgb,diseaseView.rgb,diseaseView.a);
      if(pathologyKind>.5&&pathologyKind<1.5){
        float theta=atan(p.z,p.x-.15);
        float upper=4.25+.42*pow(.5+.5*cos(theta*3.),2.);
        float mask=smoothstep(3.6,3.95,p.y)*(1.-smoothstep(upper-.035,upper+.045,p.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.59,.19,.135)*(.92+.15*mottling),mask*.85);
      }
      if(pathologyKind>1.5){
        float d=length(p-ulcerCentre)+(noiseT(p*24.)-.5)*.024;
        float rim=(1.-smoothstep(.28,.35,d))*smoothstep(.19,.24,d);
        float baseMask=1.-smoothstep(.215,.25,d);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.46,.075,.047)*(.88+.2*mottling),rim*.86);
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.61,.47,.24),vec3(.86,.77,.51),noiseT(p*42.)),baseMask*.96);
      }
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      roughnessFactor*=.84+.32*noiseT(tissuePosition*18.);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      // Shallow epithelial relief; large folds belong to geometry.
      float mucosaDetail=dot(mucosaSample(tissuePosition,w),vec3(.25,.5,.25));
      float micro=mucosaDetail*.007+noiseT(tissuePosition*73.)*.0007+noiseT(tissuePosition*24.)*.0018;
      vec3 q0=dFdx(vViewPosition),q1=dFdy(vViewPosition),s0=cross(q1,normal),s1=cross(normal,q0);
      float det=dot(q0,s0);
      normal=normalize(abs(det)*normal-sign(det)*(dFdx(micro)*s0+dFdy(micro)*s1));
    `);
  };
  return material;
}
