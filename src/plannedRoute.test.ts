import { describe, expect, it } from 'vitest';
import { remainingRoutePoints } from './plannedRoute';

const track = [
  { time: 0, east: 0, north: 0, heading: 0 },
  { time: 10, east: 0, north: 100, heading: 0 },
  { time: 20, east: 80, north: 160, heading: 60 },
];

describe('remaining authored route', () => {
  it('starts at the current vessel position and preserves future turn points', () => {
    expect(remainingRoutePoints(track, 5)).toEqual([0, 2, -50, 0, 2, -100, 80, 2, -160]);
    expect(remainingRoutePoints(track, 15)).toEqual([40, 2, -130, 80, 2, -160]);
  });

  it('clamps the start and removes the route once the vessel has arrived', () => {
    expect(remainingRoutePoints(track, -10)).toEqual(remainingRoutePoints(track, 0));
    expect(remainingRoutePoints(track, 20)).toEqual([]);
    expect(remainingRoutePoints(track, 25)).toEqual([]);
  });

  it('reconstructs the same route when seeking backwards and omits stationary segments', () => {
    const atFive = remainingRoutePoints(track, 5);
    remainingRoutePoints(track, 18);
    expect(remainingRoutePoints(track, 5)).toEqual(atFive);
    expect(remainingRoutePoints([
      track[0], { ...track[0], time: 5 }, { ...track[1], time: 10 },
    ], 0)).toEqual([0, 2, 0, 0, 2, -100]);
  });
});
