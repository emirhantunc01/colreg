import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {fitVessel,assetUrl} from "./vesselModel";
import {createVessel} from "./Scene";
import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
export default function HeroOcean({paused,progress}:{paused:boolean;progress:{current:number}}){
 const host=useRef<HTMLDivElement>(null),pause=useRef(paused);pause.current=paused;
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const el=host.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor('#73949f');renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.setAttribute('aria-label','Live 3D container ship on the ocean');el.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.fog=new T.FogExp2('#73949f',.0011);
  const camera=new T.PerspectiveCamera(42,1,1,4500);
  scene.add(new T.HemisphereLight('#d3efff','#163747',3));const sun=new T.DirectionalLight('#ffdfac',4);sun.position.set(-120,180,-80);scene.add(sun);
  const ship=new T.Group();scene.add(ship);
  let alive=true;
  const fallback=createVessel(224,'#152c36');ship.add(fallback);
  const disposeModel=(root:T.Object3D)=>root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
  new GLTFLoader().load(assetUrl('models/atlas-container-ship.glb',import.meta.env.BASE_URL),gltf=>{
   if(!alive){disposeModel(gltf.scene);return;}
   try{fitVessel(gltf.scene,224);}catch{disposeModel(gltf.scene);return;}
   ship.remove(fallback);disposeModel(fallback);ship.add(gltf.scene);
  },undefined,()=>{});
  const water=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 v;uniform float time;void main(){vec3 p=position;p.z+=sin(p.x*.045+time*.6)*.6+sin(p.y*.065-time*.8)*.35;v=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec3 v;uniform float time;void main(){float a=sin(v.x*.17+v.y*.23+sin(v.y*.07+time)*2.+time)*.35+sin(v.y*.31-v.x*.11+sin(v.x*.09)*3.-time*.8)*.2;float b=pow(max(0.,sin(v.x*.055+v.y*.035+sin(v.y*.12)*2.+time*.3)),28.);vec3 c=mix(vec3(.025,.12,.16),vec3(.12,.31,.36),a*.5+.5);c+=b*.035;float wake=exp(-abs(v.x)*.085)*smoothstep(-110.,-150.,v.y)*exp(-abs(v.y+175.)*.006);c=mix(c,vec3(.47,.68,.69),wake*.6);c=mix(c,vec3(.26,.37,.40),smoothstep(300.,1800.,length(v.xy)));gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
  const sea=new T.Mesh(new T.PlaneGeometry(4000,4000,160,160),water);sea.rotation.x=-Math.PI/2;scene.add(sea);
  let raf=0,t=0,last=performance.now(),visible=true;const observer=new IntersectionObserver(([e])=>visible=e.isIntersecting);observer.observe(el);
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(el);resize();
  const render=(now:number)=>{raf=requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden)return;if(!pause.current)t+=dt;water.uniforms.time.value=t;ship.rotation.z=pause.current?0:Math.sin(t*.45)*.006;ship.position.y=pause.current?0:Math.sin(t*.7)*.3;
   const p=progress.current;const angle=.85+p*2.4;const distance=innerWidth<768?410:330;camera.position.set(Math.sin(angle)*distance,110+Math.sin(p*Math.PI)*160,Math.cos(angle)*distance);camera.lookAt(innerWidth<768?-15:-65,5,0);renderer.render(scene,camera);
  };raf=requestAnimationFrame(render);
  const lost=(e:Event)=>{e.preventDefault();cancelAnimationFrame(raf);setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{alive=false;cancelAnimationFrame(raf);ro.disconnect();observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',lost);scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[progress]);
 return <div className="cinema-ocean" ref={host}>{failed&&<p className="hero-error">3D preview unavailable. Enable WebGL to explore the opening.</p>}</div>;
}
