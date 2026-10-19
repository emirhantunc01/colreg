import {fitVessel,assetUrl} from "./vesselModel";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CameraFlight } from "./CameraFlight";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { sampleTrack, toScene, type Scenario } from "./engine";

export type ViewMode = "orbit" | "overhead" | "bridge";
type Props = {
  scenario: Scenario;
  time: number;
  view: ViewMode;
  selected: string;
  labels: boolean;
  arrows: boolean;
  trails: boolean;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "3D maritime encounter");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#102c38");
    scene.fog = new THREE.FogExp2("#163743", 0.00043);
    const camera = new THREE.PerspectiveCamera(43, 1, 1, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 70;
    controls.maxDistance = 2400;
    scene.add(new THREE.HemisphereLight("#d5f5fa", "#18333b", 2.5));
    const sun = new THREE.DirectionalLight("#fff3dc", 3);
    sun.position.set(-250, 500, -180);
    scene.add(sun);
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(16000, 16000),
      new THREE.MeshStandardMaterial({
        color: "#173e4a",
        roughness: 0.48,
        metalness: 0.3,
      }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1;
    scene.add(ocean);
    const grid = new THREE.GridHelper(2400, 48, "#315965", "#254854");
    grid.position.y = -0.7;
    scene.add(grid);
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
      const label = document.createElement("div");
      label.className = "ship-label";
      label.textContent = v.name;
      label.style.setProperty("--vessel", v.color);
      container.appendChild(label);
      const vesselItem = {v,root,arrow,trail,label,modelTop:v.length*.32};
      if (v.model)
        new GLTFLoader().load(
          assetUrl(v.model, import.meta.env.BASE_URL),
          (gltf) => {
            if (!alive) {
              disposeTree(gltf.scene);
              return;
            }
            try {fitVessel(gltf.scene,v.length);} catch {
              disposeTree(gltf.scene);
              setModelWarning("Invalid model dimensions; using the standard vessel.");
              return;
            }
            vesselItem.modelTop = new THREE.Box3().setFromObject(gltf.scene).max.y + Math.max(2,v.length*.025);
            body.visible = false;
            root.add(gltf.scene);
          },
          undefined,
          () => {
            if (alive)
              setModelWarning(
                "A vessel model could not load. The standard vessel is shown.",
              );
          },
        );
      return vesselItem;
    });
    const points = props.scenario.vessels.flatMap((v) =>
      v.track.map((p) => new THREE.Vector3(p.east, 0, -p.north)),
    );
    const bounds = new THREE.Box3().setFromPoints(points),
      center = bounds.getCenter(new THREE.Vector3());
    const span = Math.max(400, bounds.getSize(new THREE.Vector3()).length());
    const resize = () => {
      const w = container.clientWidth,
        h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.clearViewOffset();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    let previousView = "",
      frame = 0,
      previousSelected = "",
      previousTime = -1,
      lastFrame = performance.now();
    const flight = new CameraFlight(),
      goalCamera = new THREE.PerspectiveCamera();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const projection = new THREE.Vector3();
    const animate = () => {
      const p = current.current;
      const offset = p.reservePanel && p.view !== "bridge" && container.clientWidth > 720 ? Math.min(170, container.clientWidth * .16) : 0;
      const zoom = offset > 0 && p.view !== "bridge" ? .72 : 1;
      if(camera.zoom !== zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}
      if ((camera.view?.offsetX ?? 0) !== offset || (offset > 0 && !camera.view?.enabled)) camera.setViewOffset(container.clientWidth,container.clientHeight,offset,0,container.clientWidth,container.clientHeight);
      for (const item of vessels) {
        const pose = toScene(sampleTrack(item.v.track, p.time));
        item.root.position.set(pose.x, 0, pose.z);
        item.root.rotation.y = pose.rotation;
        item.arrow.visible = p.arrows;
        item.trail.visible = p.trails;
        if (p.time !== previousTime) {
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
      }
      const now = performance.now();
      const changed =
        p.view !== previousView ||
        (p.view === "bridge" && p.selected !== previousSelected);
      if (changed) {
        flight.begin(
          camera,
          now,
          previousView === "" || reduced.matches || !!p.instantMotion,
        );
        controls.enabled = false;
        if (p.view === "orbit") {
          goalCamera.up.set(0, 1, 0);
          goalCamera.position.set(
            center.x + span * 0.65,
            span * 0.7,
            center.z + span * 0.8,
          );
          goalCamera.lookAt(center);
          controls.target.copy(center);
        } else if (p.view === "overhead") {
          goalCamera.up.set(0, 0, -1);
          goalCamera.position.set(center.x, span * 1.2, center.z);
          goalCamera.lookAt(center);
        }
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
      frame = requestAnimationFrame(animate);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      setError(
        "The graphics connection was lost. Reload the page to restore the 3D view.",
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    animate();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeTree(scene);
      renderer.dispose();
      renderer.domElement.remove();
      vessels.forEach((i) => i.label.remove());
    };
  }, [props.scenario]);
  return (
    <div className="scene-host" ref={host}>
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


