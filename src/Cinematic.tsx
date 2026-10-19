import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowUpRight, Navigation, Pause, Play } from "lucide-react";
import { createVessel } from "./Scene";
import { cameraAt } from "./cinematicCamera";
import "./cinematic.css";

gsap.registerPlugin(ScrollTrigger);

const vertex = `
uniform float uTime;
varying vec3 vWorld;
void main(){
 vec3 p=position;
 p.z += sin(p.x*.035+uTime*.65)*.6 + sin(p.y*.051-uTime*.8)*.35 + sin((p.x+p.y)*.12+uTime)*.15;
 vec4 world=modelMatrix*vec4(p,1.);
 vWorld=world.xyz;
 gl_Position=projectionMatrix*viewMatrix*world;
}`;
const fragment = `
uniform float uTime;
uniform vec3 uEye;
varying vec3 vWorld;
void main(){
 float dx=.021*cos(vWorld.x*.035+uTime*.65)+.018*cos((vWorld.x-vWorld.z)*.12+uTime);
 float dz=-.01785*cos(-vWorld.z*.051-uTime*.8)-.018*cos((vWorld.x-vWorld.z)*.12+uTime);
 dx+=sin(vWorld.x*.91+vWorld.z*.17+uTime)*.025;
 dz+=sin(vWorld.z*.77-vWorld.x*.23-uTime)*.025;
 vec3 n=normalize(vec3(-dx,1.,-dz));
 vec3 view=normalize(uEye-vWorld);
 vec3 light=normalize(vec3(-.6,.36,-.65));
 float fresnel=pow(1.-max(dot(n,view),0.),3.);
 float spec=pow(max(dot(reflect(-light,n),view),0.),100.);
 float detail=sin(vWorld.x*.14+vWorld.z*.31+uTime)*sin(vWorld.z*.2-uTime*.7);
 vec3 color=mix(vec3(.012,.065,.105),vec3(.12,.24,.31),fresnel);
 color+=spec*vec3(.65,.77,.84)*.7+detail*.006;
 float fog=1.-exp(-distance(uEye,vWorld)*.00055);
 color=mix(color,vec3(.035,.09,.135),fog);
 gl_FragColor=vec4(color,1.);
}`;

function Ocean({
  progress,
  paused,
}: {
  progress: React.RefObject<{ value: number }>;
  paused: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#091d2c", 0.0011);
    const camera = new THREE.PerspectiveCamera(46, 1, 1, 7000);
    scene.add(new THREE.HemisphereLight("#c7e3f5", "#112b36", 2.6));
    const light = new THREE.DirectionalLight("#dceaff", 4);
    light.position.set(-120, 180, -120);
    scene.add(light);
    const rim = new THREE.DirectionalLight("#e4c9a2", 2);
    rim.position.set(150, 60, 100);
    scene.add(rim);
    const uniforms = { uTime: { value: 0 }, uEye: { value: camera.position } };
    const seaMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
    });
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000, 240, 240),
      seaMat,
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.8;
    scene.add(sea);
    const vessel = createVessel(180, "#1d343e");
    vessel.rotation.y = Math.PI - 0.25;
    vessel.position.x = 45;
    scene.add(vessel);
    // Reusable geometry: cargo detail adds scale without external model downloads.
    const containerGeo = new THREE.BoxGeometry(8, 8, 15);
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 128;
    textureCanvas.height = 128;
    const paint = textureCanvas.getContext("2d")!;
    paint.fillStyle = "#c5cdd0";
    paint.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 128; i += 8) {
      paint.fillStyle = "#93a0a5";
      paint.fillRect(i, 0, 2, 128);
      paint.fillStyle = "#eef1f1";
      paint.fillRect(i + 2, 0, 1, 128);
    }
    paint.strokeStyle = "#5b6e77";
    paint.lineWidth = 3;
    paint.strokeRect(1, 1, 126, 126);
    const containerTexture = new THREE.CanvasTexture(textureCanvas);
    containerTexture.colorSpace = THREE.SRGBColorSpace;
    containerTexture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy(),
    );
    const materials = ["#5c757d", "#8f7564", "#385762", "#8d9792"].map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          map: containerTexture,
          roughness: 0.75,
        }),
    );
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5; col++)
        for (let level = 0; level < 2; level++) {
          const box = new THREE.Mesh(
            containerGeo,
            materials[(row + col + level) % 4],
          );
          box.position.set((row - 1) * 9, 20 + level * 8, -45 + col * 16);
          vessel.add(box);
        }
    const detail = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color: string,
    ) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.55,
          metalness: 0.25,
        }),
      );
      mesh.position.set(x, y, z);
      vessel.add(mesh);
    };
    // Deck edges, bridge glazing, lifeboats and funnel give a readable vessel silhouette.
    detail(27, 2, 26, 0, 29, 41, "#d8dedb");
    detail(27.5, 4, 1, 0, 34, 26.8, "#243e4c");
    detail(1, 4, 17, -13.9, 34, 36, "#243e4c");
    detail(1, 4, 17, 13.9, 34, 36, "#243e4c");
    for (let i = 0; i < 6; i++)
      detail(0.5, 4, 1.3, -11 + i * 4.4, 34, 26.8, "#e5e8e4");
    detail(8, 13, 9, 0, 45, 48, "#344a53");
    detail(9, 2, 10, 0, 52, 48, "#141d24");
    detail(4, 4, 10, 16, 23, 44, "#af7750");
    detail(4, 4, 10, -16, 23, 44, "#af7750");
    detail(0.5, 1, 128, -18, 17, -8, "#9bacb0");
    detail(0.5, 1, 128, 18, 17, -8, "#9bacb0");
    for (let z = -64; z <= 55; z += 7) {
      detail(0.4, 3, 0.4, -18, 15.5, z, "#9bacb0");
      detail(0.4, 3, 0.4, 18, 15.5, z, "#9bacb0");
    }
    const wakeGeo = new THREE.PlaneGeometry(160, 600, 1, 1);
    wakeGeo.rotateX(-Math.PI / 2);
    const wakeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: uniforms.uTime },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform float uTime;void main(){float w=.07+(1.-vUv.y)*.42;float edge=1.-smoothstep(w*.3,w,abs(vUv.x-.5));float fade=sin(vUv.y*3.14159);float ripple=.6+.4*sin(vUv.y*180.+uTime*3.+vUv.x*30.);gl_FragColor=vec4(.65,.83,.87,edge*fade*ripple*.16);}`,
    });
    const wake = new THREE.Mesh(wakeGeo, wakeMat);
    wake.position.set(0, 0.25, 370);
    vessel.add(wake);
    const second = createVessel(85, "#899ba0");
    second.position.set(-440, 0, -430);
    second.rotation.y = 1.1;
    scene.add(second);
    const resize = () => {
      if (!el.clientWidth || !el.clientHeight) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = 0,
      last = 0,
      elapsed = 0,
      visible = true;
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    intersection.observe(el);
    const render = (now: number) => {
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (visible && !document.hidden) {
        if (!pausedRef.current) elapsed += delta;
        uniforms.uTime.value = elapsed;
        const p = cameraAt(progress.current.value),
          mobile = camera.aspect < 0.85;
        camera.position.set(
          p.x * (mobile ? 1.55 : 1),
          p.y * (mobile ? 1.2 : 1),
          p.z * (mobile ? 1.55 : 1),
        );
        camera.lookAt(p.targetX, p.targetY, p.targetZ);
        vessel.rotation.z = pausedRef.current
          ? 0
          : Math.sin(elapsed * 0.6) * 0.006;
        vessel.position.y = pausedRef.current
          ? 0
          : Math.sin(elapsed * 0.8) * 0.2;
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const lost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(frame);
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            mats.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      containerTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress]);
  return (
    <div
      className={`cinema-ocean ${failed ? "ocean-fallback" : ""}`}
      ref={host}
    >
      {failed && <div className="fallback-horizon" />}
    </div>
  );
}

export default function Cinematic({ onEnter }: { onEnter: () => void }) {
  const root = useRef<HTMLElement>(null),
    progress = useRef({ value: 0 }),
    entering = useRef(false),
    transition = useRef<gsap.core.Timeline | null>(null);
  const [paused, setPaused] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [reduce, setReduce] = useState(paused);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduce(query.matches);
      if (query.matches) setPaused(true);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(".opening-line span", {
            yPercent: 110,
            duration: 1.3,
            stagger: 0.12,
            delay: 0.15,
          })
          .from(
            ".opening-description, .opening-action",
            { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.12 },
            "-.65",
          );
        gsap
          .timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
          })
          .to(progress.current, { value: 1, ease: "none", duration: 1 }, 0)
          .to(
            ".opening-copy",
            { y: -100, autoAlpha: 0, duration: 0.17, ease: "none" },
            0.02,
          )
          .fromTo(
            ".perspective-copy",
            { autoAlpha: 0, y: 55 },
            { autoAlpha: 1, y: 0, duration: 0.15, ease: "none" },
            0.23,
          )
          .to(
            ".perspective-copy",
            { autoAlpha: 0, y: -50, duration: 0.13, ease: "none" },
            0.55,
          )
          .fromTo(
            ".departure-copy",
            { autoAlpha: 0, y: 50 },
            { autoAlpha: 1, y: 0, duration: 0.17, ease: "none" },
            0.73,
          )
          .to(".scroll-cue", { autoAlpha: 0, duration: 0.08 }, 0)
          .to(
            ".journey-progress span",
            { scaleY: 1, transformOrigin: "top", ease: "none", duration: 1 },
            0,
          );
      },
      root,
    );
    mm.add(
      "(prefers-reduced-motion: reduce)",
      () => {
        progress.current.value = 0.2;
      },
      root,
    );
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });
    return () => {
      alive = false;
      mm.revert();
      transition.current?.kill();
    };
  }, []);
  const enter = () => {
    if (entering.current) return;
    entering.current = true;
    if (reduce) {
      onEnter();
      return;
    }
    transition.current = gsap
      .timeline({ onComplete: onEnter })
      .to(root.current!.querySelector(".cinema-veil"), {
        autoAlpha: 1,
        duration: 0.5,
        ease: "power2.inOut",
      })
      .to(
        root.current!.querySelector(".cinema-content"),
        { scale: 0.98, autoAlpha: 0, duration: 0.45, ease: "power2.in" },
        0,
      );
  };
  return (
    <section
      className={`cinematic-intro ${reduce ? "motion-reduced" : ""}`}
      ref={root}
      aria-label="Introduction to COLREG 3D"
    >
      <div className="cinema-frame">
        <Ocean progress={progress} paused={paused || reduce} />
        <div className="cinema-shade" />
        <div className="cinema-content">
          <nav className="cinema-nav" aria-label="Introduction navigation">
            <a className="cinema-brand" href="./">
              <Navigation size={23} />
              COLREG <span>3D</span>
            </a>
            <button onClick={enter}>
              Open studio <ArrowUpRight size={15} />
            </button>
          </nav>
          <div className="opening-copy">
            <p className="opening-context">
              A new perspective on maritime encounters.
            </p>
            <h1>
              <span className="opening-line">
                <span>See what</span>
              </span>
              <span className="opening-line">
                <span>comes next.</span>
              </span>
            </h1>
            <p className="opening-description">
              Step beyond the diagram.
              <br />
              Explore every encounter in three dimensions.
            </p>
            <button className="opening-action" onClick={enter}>
              Explore the encounters <ArrowUpRight size={18} />
            </button>
          </div>
          <div className="perspective-copy" aria-hidden="true">
            <span>One encounter.</span>
            <h2>
              A whole new
              <br />
              point of view.
            </h2>
            <p>
              Move from the overview to the bridge.
              <br />
              See the same moment from both sides.
            </p>
          </div>
          <div className="departure-copy">
            <h2>
              Understand
              <br />
              the movement.
            </h2>
            <p>Pause. Change perspective. Replay.</p>
            <button className="opening-action" onClick={enter}>
              Enter the studio <ArrowUpRight size={18} />
            </button>
            <small>
              Technical demonstrations. Source-based lessons coming after
              review.
            </small>
          </div>
          <div className="cinema-bottom">
            <span className="scroll-cue">
              <span className="scroll-line" />
              Scroll to change your perspective <ArrowDown size={14} />
            </span>
            <button
              onClick={() => setPaused((p) => !p)}
              disabled={reduce}
              aria-label={
                paused || reduce
                  ? "Play ambient motion"
                  : "Pause ambient motion"
              }
            >
              {paused || reduce ? <Play size={13} /> : <Pause size={13} />}
              <span>{paused || reduce ? "Motion paused" : "Pause motion"}</span>
            </button>
          </div>
          <div className="journey-progress" aria-hidden="true">
            <span />
          </div>
        </div>
        <div className="cinema-veil" />
      </div>
    </section>
  );
}
