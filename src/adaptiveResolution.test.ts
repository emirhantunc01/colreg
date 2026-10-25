import { describe, expect, it } from "vitest";
import { AdaptiveResolutionController } from "./adaptiveResolution";

function runWindow(controller: AdaptiveResolutionController, start: number, intervalMs: number) {
  let sample = null;
  for (let frame = 0; frame <= Math.floor(1000 / intervalMs); frame++)
    sample = controller.recordFrame(start + frame * intervalMs) ?? sample;
  sample = controller.recordFrame(start + 1000) ?? sample;
  return sample;
}

describe("AdaptiveResolutionController", () => {
  it("waits for three sustained slow windows and resets its streak after a healthy window", () => {
    const controller = new AdaptiveResolutionController(1.4, 30);
    expect(runWindow(controller, 0, 50)?.changed).toBe(false);
    expect(runWindow(controller, 1000, 50)?.changed).toBe(false);
    expect(runWindow(controller, 2000, 16)?.changed).toBe(false);
    expect(runWindow(controller, 3000, 50)?.changed).toBe(false);
    expect(runWindow(controller, 4000, 50)?.changed).toBe(false);
    expect(runWindow(controller, 5000, 50)?.changed).toBe(true);
    expect(controller.currentDpr).toBeCloseTo(1.3);
  });

  it("uses the one-second sampling window, resets after suspension, and clamps at minimum DPR", () => {
    const controller = new AdaptiveResolutionController(0.9, 60, 0.8);
    expect(controller.recordFrame(0)).toBeNull();
    expect(controller.recordFrame(500)).toBeNull();
    expect(controller.recordFrame(1000)?.fps).toBeCloseTo(3);
    controller.reset();
    expect(controller.recordFrame(10000)).toBeNull();
    for (let window = 0; window < 12; window++)
      runWindow(controller, 10000 + window * 1100, 50);
    expect(controller.currentDpr).toBe(0.8);
  });

  it("keeps the initial device cap when frames are healthy", () => {
    const controller = new AdaptiveResolutionController(1.35, 60);
    for (let window = 0; window < 12; window++)
      runWindow(controller, window * 1100, 16);
    expect(controller.currentDpr).toBe(1.35);
  });

  it("discards the old streak when a resize changes the mobile or desktop target", () => {
    const controller = new AdaptiveResolutionController(1.4, 30);
    runWindow(controller, 0, 50);
    runWindow(controller, 1000, 50);
    controller.setTargetFps(60);
    runWindow(controller, 3000, 50);
    runWindow(controller, 4000, 50);
    expect(controller.currentDpr).toBe(1.4);
  });
});
