import * as THREE from "three";
import { sampleTrack, toScene, type Scenario } from "./engine";
import { introProgressToScenarioTime } from "./introStory";

type CameraKeyframe = { at: number; position: THREE.Vector3; aim: THREE.Vector3 };
export type IntroCameraFrame = {
  position: THREE.Vector3;
  aim: THREE.Vector3;
  up: THREE.Vector3;
  viewOffsetY: number;
  scenarioTime: number;
};

function cameraOffsets(progress: number, mobile: boolean) {
  const frames: CameraKeyframe[] = mobile
    ? [
        { at: 0, position: new THREE.Vector3(0, 160, 360), aim: new THREE.Vector3(0, 0, -400) },
        { at: 0.12, position: new THREE.Vector3(60, 300, 500), aim: new THREE.Vector3(0, 0, -420) },
        { at: 0.3, position: new THREE.Vector3(0, 1600, 30), aim: new THREE.Vector3(0, 160, 0) },
        { at: 0.55, position: new THREE.Vector3(-100, 1700, 60), aim: new THREE.Vector3(0, 180, 0) },
        { at: 0.7, position: new THREE.Vector3(0, 1500, 0), aim: new THREE.Vector3(0, 220, 0) },
        { at: 1, position: new THREE.Vector3(0, 1600, 100), aim: new THREE.Vector3(0, 260, 0) },
      ]
    : [
        { at: 0, position: new THREE.Vector3(60, 95, 220), aim: new THREE.Vector3(0, 0, -270) },
        { at: 0.12, position: new THREE.Vector3(120, 360, 640), aim: new THREE.Vector3(0, 0, -500) },
        { at: 0.3, position: new THREE.Vector3(0, 1240, 100), aim: new THREE.Vector3(0, 150, 0) },
        { at: 0.55, position: new THREE.Vector3(-100, 1100, 40), aim: new THREE.Vector3(0, 170, 0) },
        { at: 0.7, position: new THREE.Vector3(0, 860, 120), aim: new THREE.Vector3(0, 210, 0) },
        { at: 1, position: new THREE.Vector3(100, 1220, 180), aim: new THREE.Vector3(0, 260, 0) },
      ];
  let index = frames.findIndex((frame) => frame.at >= progress);
  if (index <= 0) return { position: frames[0].position.clone(), aim: frames[0].aim.clone() };
  const a = frames[index - 1];
  const b = frames[index];
  const before = frames[Math.max(0, index - 2)];
  const after = frames[Math.min(frames.length - 1, index + 1)];
  const span = b.at - a.at;
  const t = (progress - a.at) / span;
  const interpolate = (field: "position" | "aim") => {
    const p0 = a[field], p1 = b[field];
    const m0 = p1.clone().sub(before[field]).multiplyScalar(span / (b.at - before.at || span));
    const m1 = after[field].clone().sub(p0).multiplyScalar(span / (after.at - a.at || span));
    const t2 = t * t;
    const t3 = t2 * t;
    return p0.clone().multiplyScalar(2 * t3 - 3 * t2 + 1)
      .addScaledVector(m0, t3 - 2 * t2 + t)
      .addScaledVector(p1, -2 * t3 + 3 * t2)
      .addScaledVector(m1, t3 - t2);
  };
  return { position: interpolate("position"), aim: interpolate("aim") };
}

/** Returns the authored-scene camera pose used by the cinematic at a story progress. */
export function introCameraFrame(
  scenario: Scenario,
  progress: number,
  width: number,
  height: number,
): IntroCameraFrame {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const scenarioTime = introProgressToScenarioTime(p, scenario.duration);
  const vessels = scenario.vessels.map((vessel) => {
    const pose = sampleTrack(vessel.track, scenarioTime);
    const scenePose = toScene(pose);
    return { vessel, pose, scenePose };
  });
  const own = vessels[0]?.scenePose ?? { x: 0, z: 0, rotation: 0 };
  const center = new THREE.Vector3();
  for (const item of vessels) center.add(new THREE.Vector3(item.scenePose.x, 0, item.scenePose.z));
  if (vessels.length) center.multiplyScalar(1 / vessels.length);
  const mobile = width < 720;
  const anchorMix = THREE.MathUtils.smoothstep(p, 0.08, 0.3);
  const anchor = new THREE.Vector3(own.x, 0, own.z).lerp(center, anchorMix);
  const offset = cameraOffsets(p, mobile);
  const overhead = THREE.MathUtils.smoothstep(p, 0.1, 0.34);
  const up = new THREE.Vector3(0, 1, 0).lerp(new THREE.Vector3(0, 0, -1), overhead).normalize();
  return {
    position: anchor.clone().add(offset.position),
    aim: anchor.clone().add(offset.aim),
    up,
    viewOffsetY: -height * 0.18 * THREE.MathUtils.smoothstep(p, 0.72, 1),
    scenarioTime,
  };
}

/** Projects all authored hull/deck corners using the actual cinematic camera pose. */
export function projectIntroVessels(
  scenario: Scenario,
  progress: number,
  width: number,
  height: number,
) {
  const frame = introCameraFrame(scenario, progress, width, height);
  const camera = new THREE.PerspectiveCamera(width < 720 ? 42 : 39, width / height, 1, 11000);
  camera.up.copy(frame.up);
  camera.position.copy(frame.position);
  camera.lookAt(frame.aim);
  camera.setViewOffset(width, height, 0, frame.viewOffsetY, width, height);
  camera.updateMatrixWorld(true);
  return scenario.vessels.map((vessel) => {
    const pose = sampleTrack(vessel.track, frame.scenarioTime);
    const scenePose = toScene(pose);
    const yaw = scenePose.rotation;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const points: THREE.Vector3[] = [];
    for (const x of [-vessel.length * 0.075, vessel.length * 0.075])
      for (const y of [-1, vessel.length * 0.34])
        for (const z of [-vessel.length * 0.52, vessel.length * 0.52])
          points.push(new THREE.Vector3(
            scenePose.x + x * c + z * s,
            y,
            scenePose.z - x * s + z * c,
          ).project(camera));
    return {
      id: vessel.id,
      minX: Math.min(...points.map((point) => point.x)),
      maxX: Math.max(...points.map((point) => point.x)),
      minY: Math.min(...points.map((point) => point.y)),
      maxY: Math.max(...points.map((point) => point.y)),
      minDepth: Math.min(...points.map((point) => point.z)),
      maxDepth: Math.max(...points.map((point) => point.z)),
    };
  });
}
