import { describe, it, expect } from "vitest";
import { PerspectiveCamera } from "three";
import { CameraFlight } from "./CameraFlight";
describe("camera flight", () => {
  it("preserves the starting view and reaches the requested view", () => {
    const camera = new PerspectiveCamera(),
      goal = new PerspectiveCamera();
    camera.position.set(0, 0, 0);
    goal.position.set(80, 40, -80);
    goal.rotation.y = Math.PI / 2;
    const flight = new CameraFlight();
    flight.begin(camera, 0, false);
    flight.apply(camera, goal, 0);
    expect(camera.position.toArray()).toEqual([0, 0, 0]);
    flight.apply(camera, goal, 250);
    expect(camera.position.toArray()).toEqual([70, 35, -70]);
    expect(camera.quaternion.angleTo(goal.quaternion)).toBeGreaterThan(0);
    flight.apply(camera, goal, 500);
    expect(camera.position.toArray()).toEqual([80, 40, -80]);
    expect(camera.quaternion.angleTo(goal.quaternion)).toBeCloseTo(0);
    expect(flight.active).toBe(false);
  });
  it("retargets from the displayed view without a positional jump", () => {
    const camera = new PerspectiveCamera(),
      goal = new PerspectiveCamera();
    goal.position.set(80, 40, -80);
    const flight = new CameraFlight();
    flight.begin(camera, 0, false);
    flight.apply(camera, goal, 250);
    flight.begin(camera, 250, false);
    goal.position.set(-10, 35, -70);
    flight.apply(camera, goal, 250);
    expect(camera.position.toArray()).toEqual([70, 35, -70]);
    flight.apply(camera, goal, 750);
    expect(camera.position.toArray()).toEqual([-10, 35, -70]);
  });
  it("snaps for reduced-motion or keyboard actions", () => {
    const camera = new PerspectiveCamera(),
      goal = new PerspectiveCamera();
    goal.position.set(80, 40, -80);
    const flight = new CameraFlight();
    flight.begin(camera, 0, true);
    flight.apply(camera, goal, 0);
    expect(camera.position.toArray()).toEqual([80, 40, -80]);
    expect(flight.active).toBe(false);
  });
});
