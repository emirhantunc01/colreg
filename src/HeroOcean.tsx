import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { parseScenario, sampleTrack, toScene, type Scenario } from "./engine";
import { createVessel } from "./Scene";
import { fitVessel } from "./vesselModel";
import { loadVesselModel } from "./vesselAssets";
import { HEAD_ON_SCENARIO_ID, introProgressToScenarioTime } from "./introStory";
import { introCameraFrame } from "./introCamera";
import { createMaritimeEnvironment, type MaritimeVesselPose } from "./maritimeEnvironment";
import { projectPreview } from "./preview";
import EncounterPreview from "./EncounterPreview";
import type { Preview } from "./previewSchema";
import { AdaptiveResolutionController } from "./adaptiveResolution";

type Props = { paused: boolean; progress: { current: number } };
type VesselRig = { group: T.Group; vessel: Scenario["vessels"][number] };

function toPreview(scenario: Scenario): Preview {
  return projectPreview({
    id: scenario.id,
    duration: scenario.duration,
    vessels: scenario.vessels.map((vessel) => ({
      id: vessel.id,
      color: vessel.color,
      length: vessel.length,
      track: vessel.track.map(({ time, east, north, heading }) => ({ time, east, north, heading })),
    })),
    environment: scenario.environment,
    conditions: scenario.conditions,
    steps: scenario.steps,
  });
}

const loadable = (path: string) => /\.(glb|gltf)$/i.test(path);

function disposeObject(root: T.Object3D) {
  root.traverse((object) => {
    if (object instanceof T.Mesh || object instanceof T.Line) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof T.Texture) value.dispose();
        material.dispose();
      }
    }
  });
}

export default function HeroOcean({ paused, progress }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  pause.current = paused;
  const [message, setMessage] = useState("");
  const [showPoster, setShowPoster] = useState(true);
  const [posterPreview, setPosterPreview] = useState<Preview | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}scenarios/${HEAD_ON_SCENARIO_ID}.json`, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the head-on preview.");
        return response.json();
      })
      .then((data: unknown) => setPosterPreview(toPreview(parseScenario(data))))
      .catch(() => undefined);
    return () => abort.abort();
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      setMessage("3D preview unavailable. This illustration shows the same Rule 14 example: two power-driven vessels in sight on reciprocal courses; tracks and timing are illustrative.");
      return;
    }
    const initialDpr = Math.min(window.devicePixelRatio || 1, 1.35);
    renderer.setPixelRatio(initialDpr);
    const resolution = new AdaptiveResolutionController(initialDpr, window.innerWidth < 768 ? 30 : 60);
    renderer.setClearColor("#bdd5dc");
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.setAttribute("aria-label", "Two power-driven vessels meeting head-on and turning to starboard");
    element.appendChild(renderer.domElement);

    const scene = new T.Scene();
    scene.background = new T.Color("#bdd5dc");
    scene.fog = new T.Fog("#bdd5dc", 1800, 7600);
    const camera = new T.PerspectiveCamera(39, 1, 1, 11000);
    const worldUp = new T.Vector3(0, 1, 0);
    camera.up.copy(worldUp);
    const maritime = createMaritimeEnvironment();
    scene.add(maritime.group);

    let alive = true;
    let lost = false;
    let scenario: Scenario | null = null;
    const rigs: VesselRig[] = [];
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}scenarios/${"head-on-powered.json"}`, { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("The head-on lesson could not be loaded.");
        return response.json();
      })
      .then((data: unknown) => {
        if (!alive) return;
        scenario = parseScenario(data);
        for (const vessel of scenario.vessels) {
          const group = new T.Group();
          const fallback = createVessel(vessel.length, vessel.color);
          group.add(fallback);
          scene.add(group);
          const rig: VesselRig = { group, vessel };
          rigs.push(rig);
          if (!vessel.model || !loadable(vessel.model)) continue;
          loadVesselModel(vessel.model, import.meta.env.BASE_URL, window.innerWidth < 768).then((model) => {
            if (!alive) {
              disposeObject(model);
              return;
            }
            try {
              fitVessel(model, vessel.length);
              group.remove(fallback);
              disposeObject(fallback);
              group.add(model);
            } catch {
              disposeObject(model);
            }
          }).catch(() => undefined);
        }
        setMessage("");
        setShowPoster(false);
      })
      .catch((error: unknown) => {
        if (alive && !(error instanceof DOMException && error.name === "AbortError")) {
          setMessage("3D preview could not load. This illustration shows the same Rule 14 example: two power-driven vessels in sight on reciprocal courses; tracks and timing are illustrative.");
        }
      });

    let raf = 0;
    let active = false;
    let visible = false;
    let width = 0;
    let height = 0;
    let last = performance.now();
    let seaTime = 0;
    const render = (now: number) => {
      raf = 0;
      if (!active || lost) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!pause.current) seaTime += dt;
      if (scenario) {
        const storyTime = introProgressToScenarioTime(progress.current, scenario.duration);
        const wakePoses: MaritimeVesselPose[] = [];
        for (const rig of rigs) {
          const pose = sampleTrack(rig.vessel.track, storyTime);
          const position = toScene(pose);
          rig.group.position.set(position.x, 0, position.z);
          rig.group.rotation.y = (-pose.heading * Math.PI) / 180;
          const history = Array.from({ length: 16 }, (_, index) => {
            const sampleTime = Math.max(0, storyTime - (15 - index) * 0.75);
            const historyPose = sampleTrack(rig.vessel.track, sampleTime);
            const sample = toScene(historyPose);
            return { x: sample.x, z: sample.z, heading: historyPose.heading };
          });
          wakePoses.push({ id: rig.vessel.id, x: position.x, z: position.z, heading: pose.heading, length: rig.vessel.length, history });
        }
        maritime.update(seaTime, wakePoses);
        const frame = introCameraFrame(scenario, progress.current, width, height);
        camera.up.copy(frame.up);
        camera.position.copy(frame.position);
        camera.lookAt(frame.aim);
        camera.setViewOffset(width, height, 0, frame.viewOffsetY, width, height);
      }
      renderer.render(scene, camera);
      resolution.setTargetFps(width < 720 ? 30 : 60);
      const performanceSample = resolution.recordFrame(performance.now());
      if (performanceSample?.changed) renderer.setPixelRatio(performanceSample.dpr);
      if (import.meta.env.DEV && performanceSample) {
        renderer.domElement.dataset.fps = String(Math.round(performanceSample.fps));
        renderer.domElement.dataset.dpr = String(renderer.getPixelRatio());
        renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
        renderer.domElement.dataset.triangles = String(renderer.info.render.triangles);
      }
      raf = requestAnimationFrame(render);
    };
    const syncLoop = () => {
      const shouldRun = visible && !document.hidden && !lost;
      if (shouldRun && !active) {
        active = true;
        resolution.reset();
        last = performance.now();
        raf = requestAnimationFrame(render);
      } else if (!shouldRun && active) {
        active = false;
        resolution.reset();
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncLoop();
    }, { threshold: 0 });
    observer.observe(element);
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = width < 720 ? 42 : 39;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    resize();
    const visibilityChange = () => syncLoop();
    document.addEventListener("visibilitychange", visibilityChange);
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      setMessage("3D preview interrupted. The static illustration still shows the Rule 14 example and its assumptions.");
      setShowPoster(true);
      syncLoop();
    };
    const onRestored = () => {
      lost = false;
      setMessage("");
      setShowPoster(!scenario);
      syncLoop();
    };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    renderer.domElement.addEventListener("webglcontextrestored", onRestored);
    syncLoop();

    return () => {
      alive = false;
      abort.abort();
      active = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
      scene.remove(maritime.group);
      maritime.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress]);

  return <div className="cinema-ocean" ref={host}>
    {showPoster && <div className="cinema-poster" role="img" aria-label="Static plot of the actual Rule 14 example, with its authored vessel tracks and stated assumptions">
      {posterPreview && <EncounterPreview preview={posterPreview} active={false} />}
    </div>}
    {message && <p className="hero-error" role="status">{message}</p>}
  </div>;
}
