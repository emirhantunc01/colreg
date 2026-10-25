import { describe, expect, it } from "vitest";
import headOnRaw from "../public/scenarios/head-on-powered.json";
import { parseScenario } from "./engine";
import { projectIntroVessels } from "./introCamera";

const scenario = parseScenario(headOnRaw);
const storyPoints = [0, 0.3, 0.5, 0.7, 1];

describe("introCameraFrame", () => {
  it.each([
    [390, 844],
    [1440, 900],
  ])("keeps authored head-on hull and deck corners inside %sx%s at every story beat", (width, height) => {
    for (const progress of storyPoints) {
      const bounds = projectIntroVessels(scenario, progress, width, height);
      expect(bounds).toHaveLength(2);
      for (const vessel of bounds) {
        expect(vessel.minX, `${width}px at ${progress}: ${vessel.id} left`).toBeGreaterThanOrEqual(-0.96);
        expect(vessel.maxX, `${width}px at ${progress}: ${vessel.id} right`).toBeLessThanOrEqual(0.96);
        expect(vessel.minY, `${width}px at ${progress}: ${vessel.id} top`).toBeGreaterThanOrEqual(-0.96);
        expect(vessel.maxY, `${width}px at ${progress}: ${vessel.id} bottom`).toBeLessThanOrEqual(0.96);
        expect(vessel.minDepth).toBeGreaterThanOrEqual(-1);
        expect(vessel.maxDepth).toBeLessThanOrEqual(1);
      }
    }
  });
});
