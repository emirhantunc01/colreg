import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CameraFlight } from "./CameraFlight";
import { dayShapeLayout, lightPhaseOn, type LightColor, type VesselProfile } from "./trainingData";
import { lightVisible } from "./trainingData";
import { viewPosition, type RecognitionView } from "./recognition";

const colorValue: Record<LightColor, number> = { white: 0xfff8dc, red: 0xff3737, green: 0x35dc7b, yellow: 0xffc52e };
type Props = { profile: VesselProfile; length: number; view: RecognitionView; night: boolean; sectors: boolean; time: number; resetKey: number; onBearingChange: (bearing: number) => void };
type Runtime = Pick<Props, "profile" | "length" | "view" | "night" | "sectors" | "time">;

function dispose(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function makeVessel(length: number) {
  const root = new THREE.Group();
  const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.16 });
  const shape = new THREE.Shape();
  shape.moveTo(0, -length * 0.5); shape.lineTo(length * 0.12, -length * 0.3); shape.lineTo(length * 0.13, length * 0.37);
  shape.quadraticCurveTo(0, length * 0.5, -length * 0.13, length * 0.37); shape.lineTo(-length * 0.12, -length * 0.3); shape.closePath();
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: length * 0.09, bevelEnabled: true, bevelSize: length * 0.012, bevelThickness: length * 0.01, bevelSegments: 2 }).rotateX(Math.PI / 2), material(0x345663));
  hull.position.y = length * 0.06; root.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(length * 0.19, length * 0.025, length * 0.64), material(0xd8dfd8)); deck.position.y = length * 0.12; root.add(deck);
  const house = new THREE.Mesh(new THREE.BoxGeometry(length * 0.18, length * 0.13, length * 0.17), material(0xf0eee5)); house.position.set(0, length * 0.19, length * 0.17); root.add(house);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(length * 0.19, length * 0.04, length * 0.13), material(0x29434b)); bridge.position.set(0, length * 0.27, length * 0.14); root.add(bridge);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(length * 0.007, length * 0.009, length * 0.32, 10), material(0x66747a)); mast.position.set(0, length * 0.35, -length * 0.07); root.add(mast);
  return root;
}

function addLights(root: THREE.Group, profile: VesselProfile, length: number) {
  return profile.lights.map((mark) => {
    const group = new THREE.Group();
    const color = colorValue[mark.color];
    const orb = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.15, length * 0.018), 16, 10), new THREE.MeshBasicMaterial({ color }));
    const glow = new THREE.PointLight(color, mark.color === "white" ? 12 : 18, length * 0.65, 2);
    group.position.set((mark.x ?? 0) * length / 20, mark.y * length / 20, (mark.z ?? 0) * length / 20);
    group.userData.mark = mark; group.add(orb, glow); root.add(group); return group;
  });
}

function addShapes(root: THREE.Group, profile: VesselProfile, length: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x090d0d, roughness: 0.9 });
  const shapes = profile.shapes ?? [];
  const layout = dayShapeLayout(profile.id, shapes.length);
  shapes.forEach((kind, index) => {
    const size = Math.max(0.35, length * 0.028);
    let mesh: THREE.Mesh;
    if (kind === "ball") mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), material);
    else if (kind === "cylinder") mesh = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.7, size * 0.7, size * 2, 12), material);
    else if (kind === "diamond") mesh = new THREE.Mesh(new THREE.OctahedronGeometry(size * 1.15), material);
    else if (kind === "flag-a") {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.2, size * 1.5), new THREE.MeshBasicMaterial({ color: 0xe8f4ef, side: THREE.DoubleSide }));
      const blue = new THREE.Mesh(new THREE.PlaneGeometry(size * 1.05, size * 1.5), new THREE.MeshBasicMaterial({ color: 0x246bb1, side: THREE.DoubleSide }));
      blue.position.z = 0.01; blue.rotation.z = -0.58; mesh.add(blue);
    } else if (kind === "cones-apex") {
      mesh = new THREE.Mesh(new THREE.ConeGeometry(size, size * 1.7, 14), material); mesh.rotation.z = Math.PI;
      const second = new THREE.Mesh(new THREE.ConeGeometry(size, size * 1.7, 14), material); second.rotation.z = Math.PI; second.position.y = size * 1.7; mesh.add(second);
    } else { mesh = new THREE.Mesh(new THREE.ConeGeometry(size, size * 1.8, 14), material); if (kind === "cone-down") mesh.rotation.z = Math.PI; }
    const point = layout[index]; mesh.position.set(point.x * length, point.y * length, point.z * length); group.add(mesh);
  });
  root.add(group); return group;
}

function makeSectors(length: number, profile: VesselProfile) {
  const group = new THREE.Group();
  const sectors = new Map<string, VesselProfile["lights"][number]>();
  for (const mark of profile.lights) if (mark.sector) sectors.set(`${mark.color}:${mark.sector.start}:${mark.sector.end}`, mark);
  for (const mark of sectors.values()) {
    const sector = mark.sector!;
    const span = ((sector.end - sector.start) % 360 + 360) % 360 || 360;
    const shape = new THREE.Shape(); shape.moveTo(0, 0);
    for (let step = 0; step <= 48; step++) { const angle = THREE.MathUtils.degToRad(sector.start + span * step / 48), radius = step === 0 ? length * 0.65 : length * 1.7; shape.lineTo(Math.sin(angle) * radius, -Math.cos(angle) * radius); }
    for (let step = 48; step >= 0; step--) { const angle = THREE.MathUtils.degToRad(sector.start + span * step / 48); shape.lineTo(Math.sin(angle) * length * 0.65, -Math.cos(angle) * length * 0.65); }
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: colorValue[mark.color], transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    mesh.rotation.x = Math.PI / 2; mesh.position.y = 0.12; group.add(mesh);
  }
  return group;
}

function initialCameraPosition(view: RecognitionView, length: number) {
  if (view === "free") return new THREE.Vector3(length * 1.1, length * 0.85, length * 1.45);
  const point = viewPosition(view, length); return new THREE.Vector3(point.x, point.y, point.z);
}

export default function RecognitionScene({ profile, length, view, night, sectors, time, resetKey, onBearingChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [sceneError, setSceneError] = useState(false);
  const runtime = useRef<Runtime>({ profile, length, view, night, sectors, time });
  const bearingCallback = useRef(onBearingChange);
  const previousCamera = useRef({ view, resetKey });
  runtime.current = { profile, length, view, night, sectors, time };
  bearingCallback.current = onBearingChange;

  type LabHost = HTMLDivElement & { __labUpdateModel?: () => void; __labAppearance?: () => void; __labSetCamera?: (targetView: RecognitionView, instant: boolean, reset: boolean) => void };
  useEffect(() => {
    const container = host.current; if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { container.textContent = "3D view unavailable. Reference and recognition controls remain available."; return; }
    setSceneError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "Rotatable educational vessel model"); container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49;
    const vessel = new THREE.Group(); scene.add(vessel);
    let lightGroups: THREE.Group[] = []; let shapes: THREE.Group | null = null;
    let sectorGroup = new THREE.Group(); scene.add(sectorGroup);
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x0a2932, roughness: 0.76, metalness: 0.08 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.2; scene.add(sea);
    const grid = new THREE.GridHelper(1, 28, 0x28505a, 0x173d47); grid.position.y = -0.1; grid.visible=false; scene.add(grid);
    const hemisphere = new THREE.HemisphereLight(0x8cabb7, 0x051013, 0.65); scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xfff3da, 0.4); scene.add(sun);
    const flight = new CameraFlight();
    const goal = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    let frame = 0; let lastBearing = -999; let resizeObserver: ResizeObserver | null = null;
    const rebuildModel = () => {
      const previousLength = Number(vessel.userData.length ?? runtime.current.length);
      while (vessel.children.length) { const child = vessel.children[0]; vessel.remove(child); dispose(child); }
      const r = runtime.current; const model = makeVessel(r.length); vessel.add(model);
      lightGroups = addLights(model, r.profile, r.length); shapes = addShapes(model, r.profile, r.length);
      vessel.userData.length = r.length;
      if (previousLength !== r.length) { const scale = r.length / previousLength; camera.position.multiplyScalar(scale); controls.target.multiplyScalar(scale); camera.far = Math.max(1000, r.length * 20); camera.updateProjectionMatrix(); }
      if (previousLength !== r.length && flight.active) { flight.active = false; controls.enabled = true; }
      sea.scale.setScalar(1); grid.scale.set(r.length * 7, 1, r.length * 7);
      sea.geometry.dispose(); sea.geometry = new THREE.CircleGeometry(r.length * 7, 64);
      sectorGroup.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => m.dispose()); } });
      scene.remove(sectorGroup); sectorGroup = makeSectors(r.length, r.profile); scene.add(sectorGroup);
    };
    const updateAppearance = () => {
      const r = runtime.current;
      scene.background = new THREE.Color(r.night ? 0x102c38 : 0xb9d8d5);
      shapes && (shapes.visible = !r.night);
      (sea.material as THREE.MeshStandardMaterial).color.setHex(r.night ? 0x0a2932 : 0xb9d8d5);
      hemisphere.color.setHex(r.night ? 0x8cabb7 : 0xffffff); hemisphere.groundColor.setHex(r.night ? 0x051013 : 0x78918d); hemisphere.intensity = r.night ? 0.65 : 2.4;
      sun.intensity = r.night ? 0.4 : 2.5; sun.position.set(-r.length, r.length * 2, -r.length);
      sectorGroup.visible = r.night && r.sectors;
    };
    const setCamera = (targetView: RecognitionView, instant: boolean, reset: boolean) => {
      if (targetView === "free" && !reset) { flight.active = false; controls.enabled = true; controls.update(); return; }
      const r = runtime.current; const position = initialCameraPosition(targetView, r.length);
      goal.position.copy(position); goal.up.set(0, 1, 0); goal.lookAt(targetView === "bridge" ? new THREE.Vector3(0, r.length * 0.24, -r.length) : new THREE.Vector3(0, r.length * 0.15, 0));
      controls.target.set(0, r.length * 0.14, 0); controls.enabled = false;
      flight.begin(camera, performance.now(), instant); if (instant) { flight.apply(camera, goal, performance.now()); controls.enabled = true; controls.update(); }
    };
    const interruptFlight = () => { if (flight.active) { flight.active = false; controls.enabled = true; controls.update(); } };
    const contextLost = (event: Event) => { event.preventDefault(); setSceneError(true); };
    const contextRestored = () => setSceneError(false);
    renderer.domElement.addEventListener("pointerdown", interruptFlight, true);
    renderer.domElement.addEventListener("wheel", interruptFlight, { passive: true });
    renderer.domElement.addEventListener("webglcontextlost", contextLost, false);
    renderer.domElement.addEventListener("webglcontextrestored", contextRestored, false);
    rebuildModel(); updateAppearance();
    camera.position.copy(initialCameraPosition(runtime.current.view, runtime.current.length)); camera.lookAt(0, runtime.current.length * 0.15, 0); controls.target.set(0, runtime.current.length * 0.14, 0); controls.enabled = true;
    const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.fov = THREE.MathUtils.clamp(40 + (1.15 - camera.aspect) * 20, 40, 54); camera.far = Math.max(1000, runtime.current.length * 20); camera.updateProjectionMatrix(); };
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
    const animate = (now: number) => {
      const r = runtime.current;
      if (flight.active) { flight.apply(camera, goal, now); if (!flight.active) { controls.enabled = true; controls.update(); } }
      else controls.update();
      const theta = Math.atan2(camera.position.x, -camera.position.z); const bearing = (THREE.MathUtils.radToDeg(theta) + 360) % 360;
      if (Math.abs(bearing - lastBearing) > 0.001) { lastBearing = bearing; bearingCallback.current(bearing); }
      for (const light of lightGroups) { const mark = light.userData.mark as VesselProfile["lights"][number]; light.visible = r.night && (!mark.sector || lightVisible(bearing, mark.sector)) && lightPhaseOn(mark, r.time); }
      renderer.render(scene, camera); frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const cleanup = () => { cancelAnimationFrame(frame); resizeObserver?.disconnect(); renderer.domElement.removeEventListener("pointerdown", interruptFlight, true); renderer.domElement.removeEventListener("wheel", interruptFlight); renderer.domElement.removeEventListener("webglcontextlost", contextLost); renderer.domElement.removeEventListener("webglcontextrestored", contextRestored); controls.dispose(); dispose(scene); renderer.dispose(); renderer.domElement.remove(); };
    (container as LabHost).__labUpdateModel = () => { rebuildModel(); updateAppearance(); };
    (container as LabHost).__labAppearance = updateAppearance;
    (container as LabHost).__labSetCamera = setCamera;
    return () => { delete (container as LabHost).__labUpdateModel; delete (container as LabHost).__labAppearance; delete (container as LabHost).__labSetCamera; cleanup(); };
  }, []);

  useEffect(() => { const container = host.current as LabHost | null; container?.__labUpdateModel?.(); }, [profile, length]);
  useEffect(() => { const container = host.current as LabHost | null; container?.__labAppearance?.(); }, [night, sectors]);
  useEffect(() => {
    const container = host.current as LabHost | null; if (!container?.__labSetCamera) return;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previous = previousCamera.current;
    if (previous.view !== view || previous.resetKey !== resetKey) container.__labSetCamera(view, isReduced, previous.resetKey !== resetKey);
    previousCamera.current = { view, resetKey };
  }, [view, resetKey]);

  return <div className="lab-canvas" ref={host}>{sceneError && <p className="scene-error" role="status">3D context unavailable. Your selected condition and written explanation remain available.</p>}</div>;
}
