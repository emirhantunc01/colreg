import { describe, expect, it } from "vitest";
import { projectPreview, samplePreviewTrack, type PreviewInput } from "./preview";
import { previewSchema } from "./previewSchema";
import library from "../public/scenarios/index.json";

describe("scenario preview projection", () => {
  it("fits every vessel track into the fixed aspect ratio and flips north upward", () => {
    const preview = projectPreview({
      duration: 10,
      vessels: [
        { id: "a", color: "#50d5c2", length: 30, track: [{ time: 0, east: 0, north: 0, heading: 0 }, { time: 10, east: 100, north: 100, heading: 90 }] },
        { id: "b", color: "#f4b76a", length: 40, track: [{ time: 0, east: 100, north: 0, heading: 180 }, { time: 10, east: 0, north: 100, heading: 270 }] },
      ],
      environment: { kind: "open", visibility: "clear" },
      conditions: ["Visibility is clear."],
      steps: [{ time: 0, title: "Observe" }],
    });
    expect(preview.tracks.flatMap((v) => v.route).every((p) => p.x >= 0 && p.x <= 220 && p.y >= 0 && p.y <= 120)).toBe(true);
    expect(preview.tracks[0].route[0].y).toBeGreaterThan(preview.tracks[0].route[1].y);
    expect(preview.tracks[0].route.map(({ x, y }) => [x, y])).toEqual([[62, 108], [158, 12]]);
  });

  it("handles a single-position track and interpolates headings across north", () => {
    const input: PreviewInput = {
      duration: 10,
      vessels: [{ id: "north", color: "#50d5c2", length: 20, track: [{ time: 0, east: 5, north: 5, heading: 350 }, { time: 10, east: 5, north: 5, heading: 10 }] }],
      environment: { kind: "open", visibility: "clear" }, conditions: [], steps: [],
    };
    const preview = projectPreview(input);
    expect(preview.tracks[0].route.every((point) => Number.isFinite(point.x + point.y))).toBe(true);
    expect(samplePreviewTrack(preview.tracks[0].route, 5).heading).toBeCloseTo(0);
    expect(samplePreviewTrack([{ time: 0, x: 110, y: 60, heading: 90 }], 5)).toEqual({ x: 110, y: 60, heading: 90 });
  });

  it("keeps route appearance tied to scenario data when index entries are filtered", () => {
    const input: PreviewInput = {
      duration: 10,
      vessels: [{ id: "own", color: "#50d5c2", length: 50, track: [{ time: 0, east: -10, north: 0, heading: 90 }, { time: 10, east: 10, north: 0, heading: 90 }] }],
      environment: { kind: "open", visibility: "clear" }, conditions: [], steps: [],
    };
    expect(projectPreview(input)).toEqual(projectPreview(input));
    expect(projectPreview(input).tracks[0]).toMatchObject({ id: "own", color: "#50d5c2", length: 50 });
  });

  it("projects north-south channel banks and routes through one shared coordinate transform", () => {
    const preview = projectPreview({
      id: "channel-starboard", duration: 10,
      vessels: [{ id: "own", color: "#50d5c2", length: 40, track: [{ time: 0, east: 80, north: -340, heading: 0 }, { time: 10, east: 80, north: -40, heading: 0 }] }],
      environment: { kind: "channel", visibility: "clear" }, conditions: [], steps: [],
    });
    expect(preview.geography.areas.some((area) => area.kind === "land")).toBe(true);
    const rails = preview.geography.lines.filter((line) => line.kind === "shore");
    expect(rails).toHaveLength(2);
    expect(rails[0].points[0].x).toBeLessThan(rails[1].points[0].x);
    expect(rails[0].points[0].x).toBeLessThan(preview.tracks[0].route[0].x);
    expect(rails[1].points[0].x).toBeGreaterThan(preview.tracks[0].route[0].x);
    expect(rails[0].points[0].y).toBeGreaterThan(rails[0].points[1].y);
  });

  it("includes TSS lanes and arrows pointing in both traffic directions", () => {
    const preview = projectPreview({
      id: "tss-crossing", duration: 10,
      vessels: [{ id: "crossing", color: "#50d5c2", length: 40, track: [{ time: 0, east: 80, north: -280, heading: 0 }, { time: 10, east: 80, north: 420, heading: 0 }] }],
      environment: { kind: "tss", visibility: "clear" }, conditions: [], steps: [],
    });
    const eastWestArrows = preview.geography.arrows.filter((arrow) => arrow.kind === "traffic");
    expect(eastWestArrows.length).toBeGreaterThan(0);
    expect(eastWestArrows.some((arrow) => arrow.to.x > arrow.from.x)).toBe(true);
    expect(eastWestArrows.some((arrow) => arrow.to.x < arrow.from.x)).toBe(true);
    expect(preview.geography.areas.some((area) => area.kind === "divider")).toBe(true);
  });

  it("builds valid preview metadata from all 38 actual scenario files", () => {
    const entries = library;
    const scenarios = import.meta.glob<Record<string, any>>("../public/scenarios/*.json", { eager: true, import: "default" });
    expect(entries).toHaveLength(38);
    for (const entry of entries) {
      const scenario = scenarios[`../public/scenarios/${entry.file}`] as PreviewInput & Record<string, any>;
      expect(scenario, entry.id).toBeDefined();
      const preview = projectPreview({ ...scenario, environment: scenario.environment ?? { kind: "open", visibility: "clear" } });
      expect(previewSchema.safeParse(preview).success, entry.id).toBe(true);
      expect(preview.tracks.map((v) => v.id)).toEqual(scenario.vessels.map((v: { id: string }) => v.id));
      expect(previewSchema.safeParse((entry as { preview: unknown }).preview).success, `${entry.id} index preview`).toBe(true);
    }
    expect(Object.keys(scenarios)).toHaveLength(39);
  });
});
