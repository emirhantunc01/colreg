import {fitVessel} from "./vesselModel";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CameraFlight } from "./CameraFlight";
import { loadVesselModel } from "./vesselAssets";
import { sampleTrack, toScene, type Scenario } from "./engine";
import { createMaritimeEnvironment } from "./maritimeEnvironment";
import { fitEncounterCamera, fitOverheadCamera } from "./encounterCamera";
import { projectPreview } from "./preview";
import EncounterPreview from "./EncounterPreview";
import { AdaptiveResolutionController } from "./adaptiveResolution";
import { createPlannedRoute } from "./plannedRoute";

export type ViewMode = "orbit" | "overhead" | "bridge";
type Props = {
  scenario: Scenario;
  time: number;
  view: ViewMode;
  selected: string;
  labels: boolean;
  arrows: boolean;
  trails: boolean;
  plannedRoutes?: boolean;
  grid?: boolean;
  instantMotion?: boolean;
  autoOrbit?: boolean;
  reservePanel?: boolean;
};

export function createVessel(length: number, color: string) {
  const group = new THREE.Group();
  const hull = new THREE.Shape();
  hull.moveTo(0, -length * 0.5);
  hull.lineTo(length * 0.105, -length * 0.32);
  hull.lineTo(length * 0.11, length * 0.4);
  hull.quadraticCurveTo(0, length * 0.49, -length * 0.11, length * 0.4);
  hull.lineTo(-length * 0.105, -length * 0.32);
  hull.closePath();
  const geo = new THREE.ExtrudeGeometry(hull, {
    depth: length * 0.075,
    bevelEnabled: true,
    bevelSize: 1,
    bevelThickness: 0.7,
    bevelSegments: 1,
    steps: 1,
  });
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.25 }),
  );
  mesh.position.y = length * 0.08;
  group.add(mesh);
  const box = (
    w: number,
    h: number,
    d: number,
    y: number,
    z: number,
    c: string,
  ) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }),
    );
    m.position.set(0, y, z);
    group.add(m);
  };
  box(length * 0.16, length * 0.04, length * 0.6, length * 0.085, 0, "#b6c7c9");
  box(
    length * 0.15,
    length * 0.11,
    length * 0.14,
    length * 0.15,
    length * 0.23,
    "#e4e9e3",
  );
  box(
    length * 0.16,
    length * 0.035,
    length * 0.09,
    length * 0.21,
    length * 0.21,
    "#293d46",
  );
  for (let i = 0; i < 3; i++)
    box(
      length * 0.135,
      length * 0.06,
      length * 0.1,
      length * 0.13,
      -length * 0.2 + i * length * 0.12,
      i % 2 ? "#465f69" : "#73938c",
    );
  box(1, length * 0.19, 1, length * 0.23, length * 0.28, "#d9e4df");
  return group;
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) value.dispose();
        m.dispose();
      }
    }
  });
}

export default function Scene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  current.current = props;
  const [error, setError] = useState("");
  const [modelWarning, setModelWarning] = useState("");
  const staticPreview = useMemo(() => projectPreview({
    id: props.scenario.id,
    duration: props.scenario.duration,
    vessels: props.scenario.vessels.map((vessel) => ({
      id: vessel.id,
      color: vessel.color,
      length: vessel.length,
      track: vessel.track,
    })),
    environment: props.scenario.environment,
    conditions: props.scenario.conditions,
    steps: props.scenario.steps,
  }), [props.scenario]);
  useEffect(() => {
    const container = host.current!;
    setError("");
    setModelWarning("");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setError(
        "3D view unavailable. Enable hardware acceleration and use a browser with WebGL support. The scenario notes remain available.",
      );
      return;
    }
    let alive = true;
    const mobileDisplay = window.innerWidth < 768;
    const initialDpr = Math.min(window.devicePixelRatio || 1, mobileDisplay ? 1.4 : 2);
    renderer.setPixelRatio(initialDpr);
    const resolution = new AdaptiveResolutionController(initialDpr, mobileDisplay ? 30 : 60);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "3D maritime encounter");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9eafb1");
    scene.fog = new THREE.FogExp2("#9eafb1", 0.0002);
    const maritime = createMaritimeEnvironment();
    scene.add(maritime.group);
    const camera = new THREE.PerspectiveCamera(43, 1, 1, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 70;
    controls.maxDistance = 2400;
    const grid = new THREE.GridHelper(2400, 48, "#315965", "#254854");
    grid.position.y = -0.7;
    grid.visible = !!props.grid;
    scene.add(grid);
    // Authored teaching geography: north is -Z, east is +X. Dimensions are illustrative.
    const environment=props.scenario.environment;
    if(environment.visibility==='restricted'){
      scene.fog=new THREE.FogExp2('#a9b7b7',.0045);
      scene.background=new THREE.Color('#a9b7b7');
      const sky = maritime.group.getObjectByName("maritime-sky");
      if (sky) sky.visible = false;
    }
    const geography=new THREE.Group();
    scene.add(geography);
    const strip=(x:number,z:number,w:number,d:number,color:string)=>{
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75,side:THREE.DoubleSide}));
      mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.05,z);geography.add(mesh);
    };
    const line=(coords:number[],color:string)=>{
      const geom=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
      const obj=new THREE.Line(geom,new THREE.LineBasicMaterial({color}));geography.add(obj);
    };
    if(environment.kind==='channel'){
      // A transverse water opening admits the crossing example without putting its vessel on land.
      if(props.scenario.id==='channel-crossing'){
        for(const x of [-650,650])for(const z of [-675,675])strip(x,z,1000,1050,'#566757');
      }else{strip(-650,0,1000,2400,'#566757');strip(650,0,1000,2400,'#566757');}
      for(const x of [-150,150])line([x,.8,-1200,x,.8,1200],'#b8c1a0');
      for(const direction of [-1,1])for(const north of [-300,100,500]){
        const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-direction),new THREE.Vector3(direction*80,2,-north),65,'#b6d8bc',12,7);geography.add(arrow);
      }
    }
    if(environment.kind==='bend'){
      strip(-650,0,1000,2400,'#566757');
      strip(550,-650,1400,1000,'#566757');
      strip(650,650,1000,1000,'#566757');
      const bluff=new THREE.Mesh(new THREE.BoxGeometry(260,110,260),new THREE.MeshStandardMaterial({color:'#65735b',roughness:1}));
      bluff.position.set(280,54,280);geography.add(bluff);
      line([-150,.8,1200,-150,.8,-150,1200,.8,-150],'#b8c1a0');
      line([150,.8,1200,150,.8,150,1200,.8,150],'#b8c1a0');
    }
    if(environment.kind==='tss'){
      strip(0,-150,2400,30,'#a1669c');
      for(const n of [-40,140,160,340])line([-1200,.8,-n,1200,.8,-n],'#91b0b1');
      for(const e of [-600,-300,0,300,600])for(const direction of [-1,1]){
        const north=direction===1?50:250;
        const arrow=new THREE.ArrowHelper(new THREE.Vector3(direction,0,0),new THREE.Vector3(e,2,-north),85,'#a8cad0',14,9);geography.add(arrow);
      }
    }
    if(environment.windFrom!==undefined){
      const h=environment.windFrom*Math.PI/180;
      const arrow=new THREE.ArrowHelper(new THREE.Vector3(-Math.sin(h),0,Math.cos(h)),new THREE.Vector3(-300,50,100),140,'#b6d8bc',18,12);geography.add(arrow);
    }
    const vessels = props.scenario.vessels.map((v) => {
      const root = new THREE.Group(),
        body = createVessel(v.length, v.color);
      root.add(body);
      scene.add(root);
      const arrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 3, -v.length * 0.6),
        35,
        v.color,
        8,
        5,
      );
      root.add(arrow);
      const trailGeo = new THREE.BufferGeometry();
      const trail = new THREE.Line(
        trailGeo,
        new THREE.LineBasicMaterial({
          color: v.color,
          transparent: true,
          opacity: 0.65,
        }),
      );
      scene.add(trail);
      const plannedRoute = createPlannedRoute(v.track, v.color);
      scene.add(plannedRoute.line);
      const label = document.createElement("div");
      label.className = "ship-label";
      label.textContent = v.name;
      label.style.setProperty("--vessel", v.color);
      container.appendChild(label);
      const vesselItem = {v,root,arrow,trail,plannedRoute,hasRemainingRoute:false,label,modelTop:v.length*.32};
      if (v.model)
        loadVesselModel(v.model, import.meta.env.BASE_URL, mobileDisplay)
          .then((model) => {
            if (!alive) {
              disposeTree(model);
              return;
            }
            try {fitVessel(model,v.length);} catch {
              disposeTree(model);
              setModelWarning("Invalid model dimensions; using the standard vessel.");
              return;
            }
            vesselItem.modelTop = new THREE.Box3().setFromObject(model).max.y + Math.max(2,v.length*.025);
            body.visible = false;
            root.add(model);
          },
          ).catch(() => {
            if (alive)
              setModelWarning(
                "A vessel model could not load. The standard vessel is shown.",
              );
          });
      return vesselItem;
    });
    const currentPair = (time: number) => props.scenario.vessels.map((vessel) => {
      const sampled = sampleTrack(vessel.track, time);
      const scenePose = toScene(sampled);
      return { vessel, x: scenePose.x, z: scenePose.z, heading: sampled.heading };
    });
    let previousView = "",
      frame = 0,
      previousSelected = "",
      previousTime = -1,
      lastFrame = performance.now(),
      inViewport = true,
      contextLost = false,
      refitPresetPending = false,
      manualOrbit = false;
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h || !renderer) return;
      renderer.setSize(w, h);
      camera.clearViewOffset();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (previousView === "overhead" || (previousView === "orbit" && !manualOrbit))
        refitPresetPending = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const flight = new CameraFlight(),
      goalCamera = new THREE.PerspectiveCamera();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const projection = new THREE.Vector3();
    const interruptFlight = () => {
      if (!flight.active) return;
      flight.active = false;
      controls.enabled = current.current.view === "orbit";
      controls.update();
    };
    const markManualOrbit = () => { manualOrbit = true; };
    controls.addEventListener("start", markManualOrbit);
    const scheduleFrame = () => {
      if (!frame && inViewport && !document.hidden && !contextLost)
        frame = requestAnimationFrame(animate);
    };
    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };
    const animate = () => {
      frame = 0;
      const p = current.current;
      grid.visible = !!p.grid;
      const offset = p.reservePanel && p.view !== "bridge" && container.clientWidth > 720 ? Math.min(170, container.clientWidth * .16) : 0;
      const fitZoom = 1;
      const zoom = (offset > 0 && p.view !== "bridge" ? .72 : 1) * fitZoom;
      if(camera.zoom !== zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}
      if ((camera.view?.offsetX ?? 0) !== offset || (offset > 0 && !camera.view?.enabled)) camera.setViewOffset(container.clientWidth,container.clientHeight,offset,0,container.clientWidth,container.clientHeight);
      resolution.setTargetFps(container.clientWidth < 768 ? 30 : 60);
      for (const item of vessels) {
        const pose = toScene(sampleTrack(item.v.track, p.time));
        item.root.position.set(pose.x, 0, pose.z);
        item.root.rotation.y = pose.rotation;
        item.arrow.visible = p.arrows;
        item.trail.visible = p.trails;
        if (p.time !== previousTime) {
          item.hasRemainingRoute = item.plannedRoute.update(p.time);
          const coords: number[] = [];
          for (const point of item.v.track) {
            if (point.time > p.time) break;
            coords.push(point.east, 0.2, -point.north);
          }
          coords.push(pose.x, 0.2, pose.z);
          item.trail.geometry.dispose();
          item.trail.geometry = new THREE.BufferGeometry();
          item.trail.geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(coords, 3),
          );
        }
        item.plannedRoute.line.visible = (p.plannedRoutes ?? true) && item.hasRemainingRoute;
      }
      const now = performance.now();
      const changed =
        p.view !== previousView ||
        (p.view === "bridge" && p.selected !== previousSelected) ||
        refitPresetPending;
      if (changed) {
        flight.begin(
          camera,
          now,
          previousView === "" || reduced.matches || !!p.instantMotion || refitPresetPending,
        );
        controls.enabled = false;
        if (p.view === "orbit") {
          goalCamera.up.set(0, 1, 0);
          const pair = currentPair(p.time);
          const center = new THREE.Vector3();
          for (const item of pair) center.add(new THREE.Vector3(item.x, 0, item.z));
          center.multiplyScalar(1 / Math.max(1, pair.length));
          const bounds = new THREE.Box3().setFromPoints(pair.map((item) => new THREE.Vector3(item.x, 0, item.z)));
          const span = Math.max(400, bounds.getSize(new THREE.Vector3()).length());
          if (pair.length === 2 && (previousView === "" || (refitPresetPending && !manualOrbit))) {
            const fit = fitEncounterCamera(
              pair.map((item) => ({ x: item.x, z: item.z, heading: item.heading, length: item.vessel.length })),
              camera.aspect,
              camera.fov,
              camera.zoom,
            );
            goalCamera.position.copy(fit.position);
            goalCamera.lookAt(fit.target);
            controls.target.copy(fit.target);
          } else {
            goalCamera.position.set(center.x + span * 0.9, span * 0.55, center.z + span * 0.35);
            goalCamera.lookAt(center);
            controls.target.copy(center);
          }
        } else if (p.view === "overhead") {
          const pair = currentPair(p.time);
          const fit = fitOverheadCamera(
            pair.map((item) => ({ x: item.x, z: item.z, heading: item.heading, length: item.vessel.length })),
            camera.aspect,
            camera.fov,
            camera.zoom,
          );
          goalCamera.up.set(0, 0, -1);
          goalCamera.position.copy(fit.position);
          goalCamera.lookAt(fit.target);
          controls.target.copy(fit.target);
        }
        if (p.view !== previousView) manualOrbit = false;
        refitPresetPending = false;
        previousView = p.view;
        previousSelected = p.selected;
      }
      if (p.view === "bridge") {
        const item = vessels.find((i) => i.v.id === p.selected) ?? vessels[0];
        const h = (sampleTrack(item.v.track, p.time).heading * Math.PI) / 180;
        goalCamera.up.set(0, 1, 0);
        goalCamera.position.set(
          item.root.position.x,
          item.v.bridgeHeight ?? item.v.length * 0.24,
          item.root.position.z,
        );
        const aft = item.v.bridgeAft ?? 0;
        goalCamera.position.x -= Math.sin(h)*aft;
        goalCamera.position.z += Math.cos(h)*aft;
        goalCamera.lookAt(
          goalCamera.position.x + Math.sin(h) * 500,
          goalCamera.position.y - 8,
          goalCamera.position.z - Math.cos(h) * 500,
        );
      }
      if (flight.active || p.view === "bridge")
        flight.apply(camera, goalCamera, now);
      controls.enabled = p.view === "orbit" && !flight.active;
      controls.autoRotate = !!p.autoOrbit && !reduced.matches;
      controls.autoRotateSpeed = 0.15;
      if (controls.enabled)
        controls.update(Math.min((now - lastFrame) / 1000, 0.05));
      lastFrame = now;
      camera.updateMatrixWorld();
      const wakePoses = vessels.map((item) => {
        const currentPose = sampleTrack(item.v.track, p.time);
        const before = sampleTrack(item.v.track, Math.max(0, p.time - 0.5));
        const after = sampleTrack(item.v.track, Math.min(item.v.track.at(-1)!.time, p.time + 0.5));
        const speed = Math.hypot(after.east - before.east, after.north - before.north);
        const historyDuration = Math.min(14, Math.max(8, item.v.length / 8));
        const history = [];
        for (let time = Math.max(0, p.time - historyDuration); time < p.time; time += 0.5) {
          const historicPose = sampleTrack(item.v.track, time);
          const historicScenePose = toScene(historicPose);
          history.push({ x: historicScenePose.x, z: historicScenePose.z, heading: historicPose.heading });
        }
        history.push({ x: item.root.position.x, z: item.root.position.z, heading: currentPose.heading });
        return { id: item.v.id, x: item.root.position.x, z: item.root.position.z, heading: currentPose.heading, length: item.v.length, speed, history };
      });
      maritime.update(now / 1000, wakePoses);
      for (const item of vessels) {
        projection.copy(item.root.position);
        projection.y += item.modelTop;
        projection.project(camera);
        const visible =
          p.labels &&
          projection.z > -1 &&
          projection.z < 1 &&
          Math.abs(projection.x) < 1 &&
          Math.abs(projection.y) < 1 &&
          !(p.view === "bridge" && item.v.id === p.selected);
        item.label.style.display = visible ? "block" : "none";
        item.label.style.left = `${(projection.x * 0.5 + 0.5) * container.clientWidth}px`;
        item.label.style.top = `${(-projection.y * 0.5 + 0.5) * container.clientHeight}px`;
      }
      previousTime = p.time;
      renderer.render(scene, camera);
      const performanceSample = resolution.recordFrame(performance.now());
      if (performanceSample?.changed) renderer.setPixelRatio(performanceSample.dpr);
      if (import.meta.env.DEV && performanceSample) {
        renderer.domElement.dataset.fps = String(Math.round(performanceSample.fps));
        renderer.domElement.dataset.dpr = String(renderer.getPixelRatio());
        renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
        renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
      }
      scheduleFrame();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      resolution.reset();
      stopFrame();
      setError(
        "The graphics connection was lost. Reload the page to restore the 3D view.",
      );
    };
    const restored = () => {
      contextLost = false;
      resolution.reset();
      setError("");
      scheduleFrame();
    };
    const visibilityChanged = () => {
      resolution.reset();
      document.hidden ? stopFrame() : scheduleFrame();
    };
    const viewportObserver = new IntersectionObserver(([entry]) => {
      inViewport = !!entry?.isIntersecting;
      resolution.reset();
      inViewport ? scheduleFrame() : stopFrame();
    });
    viewportObserver.observe(container);
    document.addEventListener("visibilitychange", visibilityChanged);
    renderer.domElement.addEventListener("pointerdown", interruptFlight, true);
    renderer.domElement.addEventListener("wheel", interruptFlight, { passive: true });
    renderer.domElement.addEventListener("webglcontextlost", lost);
    renderer.domElement.addEventListener("webglcontextrestored", restored);
    scheduleFrame();
    return () => {
      alive = false;
      stopFrame();
      observer.disconnect();
      viewportObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      controls.dispose();
      controls.removeEventListener("start", markManualOrbit);
      renderer.domElement.removeEventListener("pointerdown", interruptFlight, true);
      renderer.domElement.removeEventListener("wheel", interruptFlight);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("webglcontextrestored", restored);
      scene.remove(maritime.group);
      maritime.dispose();
      disposeTree(scene);
      renderer.dispose();
      renderer.domElement.remove();
      vessels.forEach((i) => i.label.remove());
    };
  }, [props.scenario]);
  return (
    <div className="scene-host" ref={host}>
      {error && <div className="scene-static-fallback" aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, background: "#102e39" }}>
        <style>{`.scene-static-fallback .encounter-preview{width:100%;height:100%}.scene-static-fallback .encounter-preview svg{width:100%;height:100%;display:block}`}</style>
        <EncounterPreview preview={staticPreview} active={false} />
      </div>}
      {error && (
        <div className="scene-error" role="alert">
          {error}
        </div>
      )}
      {modelWarning && (
        <div className="model-warning" role="status">
          {modelWarning}
        </div>
      )}
    </div>
  );
}


