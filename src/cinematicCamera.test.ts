import { describe, it, expect } from "vitest";
import { cameraAt } from "./cinematicCamera";
describe("cinematic camera", () => {
  it("clamps the camera at the first and final composition", () => {
    expect(cameraAt(-1)).toEqual({
      x: 160,
      y: 42,
      z: 235,
      targetX: -20,
      targetY: 3,
      targetZ: 0,
    });
    expect(cameraAt(2)).toEqual({
      x: 0,
      y: 480,
      z: 150,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    });
  });
  it("replays the same scroll position and reaches the second keyframe", () => {
    cameraAt(0.9);
    cameraAt(0);
    expect(cameraAt(0.5)).toEqual({
      x: -185,
      y: 95,
      z: 150,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    });
  });
});
