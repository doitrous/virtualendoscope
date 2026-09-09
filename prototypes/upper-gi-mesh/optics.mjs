import * as T from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

export function createOptics(renderer,scene,camera){
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const pass=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0},lens:{value:0},aspect:{value:1},wash:{value:0},distortion:{value:.18}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform float time,lens,aspect,wash,distortion;varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec2 p=(vUv-.5)*2.;p.x*=aspect;p/=min(1.,aspect);float r=length(p);
      if(r>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}
      // Radial lens mapping, normalised at the circle edge. The aperture stays
      // circular in pixel space even when the containing panel changes aspect.
      vec2 uv=.5+(vUv-.5)*(1.+distortion*r*r)/(1.+distortion);
      float drops=0.;
      if(lens>.001) for(int i=0;i<9;i++){
        float fi=float(i);vec2 c=vec2(hash(vec2(fi,2.)),hash(vec2(fi,8.)))*1.5-.75;
        vec2 d=p-c;float radius=.045+.035*hash(c);
        float bead=1.-smoothstep(radius*.65,radius,length(d));
        uv+=d*bead*lens*.10;drops+=bead;
      }
      uv.x+=wash*.0015*sin(vUv.y*55.+time*13.);
      vec3 color=texture2D(tDiffuse,uv).rgb;
      if(lens*drops+wash*.2>.001){
       vec3 blur=(texture2D(tDiffuse,uv+vec2(.004,0)).rgb+texture2D(tDiffuse,uv-vec2(.004,0)).rgb+texture2D(tDiffuse,uv+vec2(0,.004)).rgb+texture2D(tDiffuse,uv-vec2(0,.004)).rgb)*.25;
       color=mix(color,blur,clamp(lens*drops+wash*.2,0.,.8));
      }
      color+=vec3(.035)*drops*lens;
      color*=1.-.32*smoothstep(.35,1.,r);
      color+=(hash(vUv*1600.+fract(time)*100.)-.5)*.006;
      float mask=1.-smoothstep(.99,1.,r);
      gl_FragColor=vec4(color*mask,1.);
    }`});
  composer.addPass(pass);composer.addPass(new OutputPass());
  const meter=new T.WebGLRenderTarget(16,16,{type:T.UnsignedByteType,depthBuffer:true});
  const pixels=new Uint8Array(16*16*4);let meterClock=1,targetExposure=.9;
  return {composer,uniforms:pass.uniforms,updateExposure(dt){
    meterClock+=dt;
    if(meterClock>.20){
      meterClock=0;const oldTarget=renderer.getRenderTarget(),oldTone=renderer.toneMapping;
      renderer.setRenderTarget(meter);renderer.toneMapping=T.NoToneMapping;
      renderer.render(scene,camera);renderer.readRenderTargetPixels(meter,0,0,16,16,pixels);
      renderer.setRenderTarget(oldTarget);renderer.toneMapping=oldTone;
      const samples=[];
      for(let y=2;y<14;y++)for(let x=2;x<14;x++)if((x-7.5)**2+(y-7.5)**2<36){
        const k=(y*16+x)*4,l=(pixels[k]*.2126+pixels[k+1]*.7152+pixels[k+2]*.0722)/255;
        if(l>.007)samples.push(l);
      }
      samples.sort((a,b)=>a-b);
      const luminance=samples.length?samples[Math.floor(samples.length*.60)]:.05;
      targetExposure=T.MathUtils.clamp(.30/Math.max(.025,luminance),.28,2.1);
    }
    // Exposure adapts over time; highlights do not instantly change the scene.
    renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,targetExposure,1-Math.exp(-dt*3));
  }};
}

export function createFluidEffects(scene,camera){
  const beads=[];const ball=new T.SphereGeometry(1,8,6);
  const material=new T.MeshPhysicalMaterial({color:'#dfddd1',transparent:true,opacity:.35,roughness:.08,metalness:0,clearcoat:1,depthWrite:false});
  for(let i=0;i<90;i++){const mesh=new T.Mesh(ball,material);mesh.visible=false;scene.add(mesh);beads.push({mesh,life:0,velocity:new T.Vector3()});}
  const pool=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshPhysicalMaterial({color:'#85754b',transparent:true,opacity:.55,roughness:.13,clearcoat:1,side:T.DoubleSide,depthWrite:false}));
  pool.rotation.x=-Math.PI/2;pool.position.set(-1.3,-3.36,0);scene.add(pool);
  let accumulator=0,cursor=0;
  const start=new T.Vector3(),forward=new T.Vector3();
  return {update(dt,state,input,inside){
    accumulator+=dt*(input.water||input.wash?75:0);
    while(accumulator>=1){accumulator--;const b=beads[cursor++%beads.length];
      start.set(.08,-.10,-.08).applyQuaternion(camera.quaternion).add(camera.position);
      b.mesh.position.copy(start);b.mesh.scale.setScalar(.009+Math.random()*.018);b.life=.5+Math.random()*.25;b.attached=false;
      forward.set((Math.random()-.5)*.22,-.04,-1).normalize().applyQuaternion(camera.quaternion);
      b.velocity.copy(forward).multiplyScalar(3.5+Math.random());b.mesh.visible=true;
    }
    for(const b of beads){if(b.life<=0)continue;b.life-=dt;
      if(!b.attached){b.velocity.y-=dt*.45;b.mesh.position.addScaledVector(b.velocity,dt);
        if(inside(b.mesh.position)>-.025){b.mesh.position.addScaledVector(b.velocity,-dt);b.attached=true;b.velocity.set(0,0,0);b.life=4;b.mesh.scale.multiplyScalar(1.5);}}
      if(input.suction)b.life-=dt*3;b.mesh.visible=b.life>0;
    }
    pool.visible=state.fluid>.01;pool.scale.set(1.25*Math.sqrt(state.fluid),.9*Math.sqrt(state.fluid),1);
    pool.position.y=-3.36+state.fluid*.10;
  }};
}
