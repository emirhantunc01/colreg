import * as THREE from "three";

export type EncounterCameraVessel = {
  x: number;
  z: number;
  heading: number;
  length: number;
};

export type EncounterCameraFit = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  projectedBounds: { minX: number; maxX: number; minY: number; maxY: number; minDepth: number; maxDepth: number };
  ownProjectedBounds: { minX: number; maxX: number; minY: number; maxY: number };
};

export type OverheadCameraFit = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  projectedBounds: { minX: number; maxX: number; minY: number; maxY: number; minDepth: number; maxDepth: number };
};

/** Fits authored hull and deck bounds into the initial camera frame. */
export function fitEncounterCamera(
  vessels: EncounterCameraVessel[],
  aspect: number,
  fov: number,
  zoom: number,
  margin = 0.78,
): EncounterCameraFit {
  if (vessels.length === 0) {
    const target = new THREE.Vector3();
    return {
      position: new THREE.Vector3(0, 300, 500), target,
      projectedBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minDepth: 0, maxDepth: 0 },
      ownProjectedBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    };
  }
  const own = vessels[0];
  const heading = THREE.MathUtils.degToRad(own.heading);
  const forward = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
  const aft = forward.clone().negate();
  const starboard = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
  const target = new THREE.Vector3(own.x, 10, own.z).addScaledVector(forward, 150);
  const initialPosition = new THREE.Vector3(own.x, 105, own.z)
    .addScaledVector(starboard, 180)
    .addScaledVector(aft, 250);
  const cameraOffset = initialPosition.clone().sub(target);
  const direction = cameraOffset.clone().normalize();
  let distance = cameraOffset.length();
  const corners: THREE.Vector3[] = [];
  for (const vessel of vessels) {
    const yaw = THREE.MathUtils.degToRad(-vessel.heading);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const halfBeam = vessel.length * 0.075;
    const halfLength = vessel.length * 0.52;
    for (const x of [-halfBeam, halfBeam])
      for (const y of [-1, vessel.length * 0.34])
        for (const z of [-halfLength, halfLength])
          corners.push(new THREE.Vector3(
            vessel.x + x * c + z * s,
            y,
            vessel.z - x * s + z * c,
          ));
  }

  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 10000);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  let projectedBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, minDepth: 0, maxDepth: 0 };
  let ownProjectedBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  const projected = new THREE.Vector3();
  for (let attempt = 0; attempt < 16; attempt++) {
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    projectedBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minDepth: Infinity, maxDepth: -Infinity };
    ownProjectedBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const [index, corner] of corners.entries()) {
      projected.copy(corner).project(camera);
      projectedBounds.minX = Math.min(projectedBounds.minX, projected.x);
      projectedBounds.maxX = Math.max(projectedBounds.maxX, projected.x);
      projectedBounds.minY = Math.min(projectedBounds.minY, projected.y);
      projectedBounds.maxY = Math.max(projectedBounds.maxY, projected.y);
      projectedBounds.minDepth = Math.min(projectedBounds.minDepth, projected.z);
      projectedBounds.maxDepth = Math.max(projectedBounds.maxDepth, projected.z);
      if (index < 8) {
        ownProjectedBounds.minX = Math.min(ownProjectedBounds.minX, projected.x);
        ownProjectedBounds.maxX = Math.max(ownProjectedBounds.maxX, projected.x);
        ownProjectedBounds.minY = Math.min(ownProjectedBounds.minY, projected.y);
        ownProjectedBounds.maxY = Math.max(ownProjectedBounds.maxY, projected.y);
      }
    }
    const extent = Math.max(
      Math.abs(projectedBounds.minX), Math.abs(projectedBounds.maxX),
      Math.abs(projectedBounds.minY), Math.abs(projectedBounds.maxY),
    ) / margin;
    if (extent <= 1 && projectedBounds.minDepth >= -1 && projectedBounds.maxDepth <= 1) break;
    // Recompute from the untouched distance; mutating position before reading it
    // would collapse the next camera position onto the target.
    distance *= Math.max(1.04, extent * 1.04);
  }
  return {
    position: target.clone().addScaledVector(direction, distance),
    target,
    projectedBounds,
    ownProjectedBounds,
  };
}

/** Fits the full authored vessel bounds into a top-down preset view. */
export function fitOverheadCamera(
  vessels: EncounterCameraVessel[],
  aspect: number,
  fov: number,
  zoom = 1,
  margin = 0.82,
): OverheadCameraFit {
  const center = vessels.reduce((sum, vessel) => sum.add(new THREE.Vector3(vessel.x, 0, vessel.z)), new THREE.Vector3())
    .multiplyScalar(1 / Math.max(1, vessels.length));
  const corners: THREE.Vector3[] = [];
  for (const vessel of vessels) {
    const yaw = THREE.MathUtils.degToRad(-vessel.heading);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const halfBeam = vessel.length * 0.075;
    const halfLength = vessel.length * 0.52;
    for (const x of [-halfBeam, halfBeam])
      for (const y of [-1, vessel.length * 0.34])
        for (const z of [-halfLength, halfLength])
          corners.push(new THREE.Vector3(
            vessel.x + x * c + z * s,
            y,
            vessel.z - x * s + z * c,
          ));
  }

  const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 10000);
  camera.up.set(0, 0, -1);
  camera.zoom = zoom;
  camera.updateProjectionMatrix();
  const target = center.clone();
  const span = Math.max(200, new THREE.Box3().setFromPoints(corners).getSize(new THREE.Vector3()).length());
  let height = span * 1.25;
  let projectedBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, minDepth: 0, maxDepth: 0 };
  const projected = new THREE.Vector3();
  for (let attempt = 0; attempt < 16; attempt++) {
    camera.position.set(center.x, height, center.z);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
    projectedBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minDepth: Infinity, maxDepth: -Infinity };
    for (const corner of corners) {
      projected.copy(corner).project(camera);
      projectedBounds.minX = Math.min(projectedBounds.minX, projected.x);
      projectedBounds.maxX = Math.max(projectedBounds.maxX, projected.x);
      projectedBounds.minY = Math.min(projectedBounds.minY, projected.y);
      projectedBounds.maxY = Math.max(projectedBounds.maxY, projected.y);
      projectedBounds.minDepth = Math.min(projectedBounds.minDepth, projected.z);
      projectedBounds.maxDepth = Math.max(projectedBounds.maxDepth, projected.z);
    }
    const extent = Math.max(
      Math.abs(projectedBounds.minX), Math.abs(projectedBounds.maxX),
      Math.abs(projectedBounds.minY), Math.abs(projectedBounds.maxY),
    ) / margin;
    if (extent <= 1 && projectedBounds.minDepth >= -1 && projectedBounds.maxDepth <= 1) break;
    height *= Math.max(1.04, extent * 1.04);
  }
  return { position: new THREE.Vector3(center.x, height, center.z), target, projectedBounds };
}
