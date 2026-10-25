import { InstancedInterleavedBuffer, InterleavedBufferAttribute } from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { sampleTrack, type TrackPoint } from './engine';

/** Actual piecewise-linear teaching track ahead of the current vessel. */
export function remainingRoutePoints(track: TrackPoint[], time: number): number[] {
  if (track.length < 2) return [];
  const clamped = Math.max(track[0].time, Math.min(time, track.at(-1)!.time));
  const current = sampleTrack(track, clamped);
  const points = [current.east, 2, -current.north || 0];
  for (const point of track) {
    if (point.time <= clamped) continue;
    const z = -point.north || 0;
    if (point.east === points.at(-3) && z === points.at(-1)) continue;
    points.push(point.east, 2, z);
  }
  return points.length >= 6 ? points : [];
}

export function createPlannedRoute(track: TrackPoint[], color: string) {
  // Reuse GPU buffers during playback instead of creating geometry every frame.
  const capacity = Math.max(1, track.length - 1);
  const geometry = new LineGeometry().setPositions(new Float32Array((capacity + 1) * 3));
  const distances = new InstancedInterleavedBuffer(new Float32Array(capacity * 2), 2, 1);
  const distanceStart = new InterleavedBufferAttribute(distances, 1, 0);
  const distanceEnd = new InterleavedBufferAttribute(distances, 1, 1);
  geometry.setAttribute('instanceDistanceStart', distanceStart);
  geometry.setAttribute('instanceDistanceEnd', distanceEnd);
  const material = new LineMaterial({
    color, linewidth: 2.5, dashed: true, dashSize: 14, gapSize: 9,
    transparent: true, opacity: 0.9, depthWrite: false, alphaToCoverage: true,
  });
  const line = new Line2(geometry, material);
  line.name = 'planned-route';
  // Only the live prefix of these fixed buffers is drawn; unused slots stay stale.
  line.frustumCulled = false;
  line.visible = false;
  const start = geometry.getAttribute('instanceStart') as InterleavedBufferAttribute;
  const end = geometry.getAttribute('instanceEnd') as InterleavedBufferAttribute;

  const update = (time: number) => {
    const points = remainingRoutePoints(track, time);
    const segments = Math.max(0, points.length / 3 - 1);
    let distance = 0;
    for (let segment = 0; segment < segments; segment++) {
      const a = segment * 3, b = a + 3;
      start.setXYZ(segment, points[a], points[a + 1], points[a + 2]);
      end.setXYZ(segment, points[b], points[b + 1], points[b + 2]);
      distanceStart.setX(segment, distance);
      distance += Math.hypot(points[b] - points[a], points[b + 2] - points[a + 2]);
      distanceEnd.setX(segment, distance);
    }
    geometry.instanceCount = segments;
    start.data.needsUpdate = true;
    distances.needsUpdate = true;
    return segments > 0;
  };
  return { line, update };
}
