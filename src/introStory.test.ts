import { describe, expect, it } from "vitest";
import { introProgressToScenarioTime } from "./introStory";

describe("introProgressToScenarioTime", () => {
  it("matches the authored Rule 14 chapter checkpoints", () => {
    expect(introProgressToScenarioTime(0)).toBe(0);
    expect(introProgressToScenarioTime(0.3)).toBe(36);
    expect(introProgressToScenarioTime(0.7)).toBe(65);
    expect(introProgressToScenarioTime(1)).toBe(90);
  });

  it("clamps scroll progress and scales to the scenario duration", () => {
    expect(introProgressToScenarioTime(-1)).toBe(0);
    expect(introProgressToScenarioTime(2)).toBe(90);
    expect(introProgressToScenarioTime(0.3, 45)).toBe(18);
  });
});
