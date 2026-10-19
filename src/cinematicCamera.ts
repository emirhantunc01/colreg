type CameraPose = {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};
const poses: CameraPose[] = [
  { x: 160, y: 42, z: 235, targetX: -20, targetY: 3, targetZ: 0 },
  { x: -185, y: 95, z: 150, targetX: 0, targetY: 0, targetZ: 0 },
  { x: 0, y: 480, z: 150, targetX: 0, targetY: 0, targetZ: 0 },
];
export function cameraAt(progress: number): CameraPose {
  const p = Math.max(0, Math.min(1, progress)) * 2;
  const i = Math.min(1, Math.floor(p)),
    t = p - i,
    f = t * t * (3 - 2 * t),
    a = poses[i],
    b = poses[i + 1];
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    z: a.z + (b.z - a.z) * f,
    targetX: a.targetX + (b.targetX - a.targetX) * f,
    targetY: a.targetY + (b.targetY - a.targetY) * f,
    targetZ: a.targetZ + (b.targetZ - a.targetZ) * f,
  };
}
