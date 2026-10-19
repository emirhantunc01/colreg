import { describe, it, expect } from "vitest";
import {
  sampleTrack,
  advanceClock,
  toScene,
  parseScenario,
  parseLibrary,
} from "./engine";
import steady from "../public/scenarios/steady-tracks.json";
import turn from "../public/scenarios/course-change.json";

describe("deterministic timeline", () => {
  const track = [
    { time: 0, east: 0, north: 20, heading: 359 },
    { time: 10, east: 100, north: 40, heading: 1 },
  ];
  it("clamps before and after the track", () => {
    expect(sampleTrack(track, -2)).toEqual({
      east: 0,
      north: 20,
      heading: 359,
    });
    expect(sampleTrack(track, 20)).toEqual({
      east: 100,
      north: 40,
      heading: 1,
    });
  });
  it("interpolates position and crosses north by the shortest turn", () => {
    expect(sampleTrack(track, 5)).toEqual({ east: 50, north: 30, heading: 0 });
    expect(sampleTrack(track, 2.5).heading).toBeCloseTo(359.5);
  });
  it("crosses north in reverse without a 358-degree turn", () => {
    expect(
      sampleTrack(
        [
          { time: 0, east: 0, north: 0, heading: 1 },
          { time: 10, east: 10, north: 10, heading: 359 },
        ],
        5,
      ),
    ).toEqual({ east: 5, north: 5, heading: 0 });
  });
  it("rewinding returns the same independently calculated position", () => {
    sampleTrack(track, 9);
    sampleTrack(track, 1);
    expect(sampleTrack(track, 5)).toEqual({ east: 50, north: 30, heading: 0 });
  });
  it("stops at the end and applies playback speed", () => {
    expect(advanceClock(8, 2, 2, 10)).toEqual({ time: 10, playing: false });
    expect(advanceClock(2, 2, 0.5, 10)).toEqual({ time: 3, playing: true });
  });
  it("maps north to negative Z and east to X", () => {
    expect(toScene({ east: 10, north: 50, heading: 90 })).toEqual({
      x: 10,
      z: -50,
      rotation: -Math.PI / 2,
    });
  });
});
describe("content validation", () => {
  it("loads both shipped scenarios and samples authored turn endpoints", () => {
    expect(parseScenario(steady).vessels).toHaveLength(2);
    const s = parseScenario(turn);
    expect(sampleTrack(s.vessels[0].track, 120)).toEqual({
      east: 205,
      north: 195,
      heading: 65,
    });
    expect(sampleTrack(s.vessels[0].track, 45)).toEqual({
      east: -87.5,
      north: -10,
      heading: 17.5,
    });
  });
  const valid = {
    id: "demo",
    title: "Demo",
    summary: "Demo scene",
    status: "technical-demo",
    duration: 10,
    sources: [],
    assumptions: ["Synthetic"],
    vessels: [
      {
        id: "a",
        name: "Alpha",
        color: "#ff0000",
        length: 40,
        track: [
          { time: 0, east: 0, north: 0, heading: 0 },
          { time: 10, east: 0, north: 100, heading: 0 },
        ],
      },
    ],
    steps: [{ time: 0, title: "Start", body: "Observe" }],
  };
  it("accepts a complete synthetic scenario", () =>
    expect(parseScenario(valid).id).toBe("demo"));
  it("rejects non-finite numbers, duplicate times and incomplete tracks", () => {
    for (const track of [
      [
        { time: 0, east: Infinity, north: 0, heading: 0 },
        { time: 10, east: 0, north: 0, heading: 0 },
      ],
      [
        { time: 0, east: 0, north: 0, heading: 0 },
        { time: 0, east: 0, north: 1, heading: 0 },
      ],
      [
        { time: 0, east: 0, north: 0, heading: 0 },
        { time: 5, east: 0, north: 1, heading: 0 },
      ],
    ]) {
      expect(() =>
        parseScenario({ ...valid, vessels: [{ ...valid.vessels[0], track }] }),
      ).toThrow();
    }
  });
  it("rejects duplicate vessel IDs, steps outside duration and unsupported colors", () => {
    expect(() =>
      parseScenario({
        ...valid,
        vessels: [valid.vessels[0], valid.vessels[0]],
      }),
    ).toThrow();
    expect(() =>
      parseScenario({
        ...valid,
        steps: [{ time: 11, title: "End", body: "End" }],
      }),
    ).toThrow();
    expect(() =>
      parseScenario({
        ...valid,
        vessels: [{ ...valid.vessels[0], color: "bad" }],
      }),
    ).toThrow();
  });
  it("requires a source for reviewed educational content", () =>
    expect(() => parseScenario({ ...valid, status: "reviewed" })).toThrow());
});

describe("scenario library validation", () => {
  it("accepts a usable local index", () =>
    expect(
      parseLibrary([
        {
          id: "demo",
          file: "demo.json",
          title: "Demo",
          subtitle: "Synthetic",
          duration: 10,
        },
      ]),
    ).toHaveLength(1));
  it("rejects empty metadata, nonfinite duration and duplicate IDs", () => {
    const valid = {
      id: "demo",
      file: "demo.json",
      title: "Demo",
      subtitle: "Synthetic",
      duration: 10,
    };
    expect(() => parseLibrary([{ ...valid, title: "" }])).toThrow();
    expect(() => parseLibrary([{ ...valid, duration: NaN }])).toThrow();
    expect(() => parseLibrary([valid, valid])).toThrow();
  });
});
