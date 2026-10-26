import { describe, expect, it } from "vitest";
import { z } from "zod";
import { educationFields } from "./educationSchema";
import { parseScenario, sampleTrack } from "./engine";
import index from "../public/scenarios/index.json";

const authored = import.meta.glob("../public/scenarios/*.json", {
  eager: true,
  import: "default",
}) as Record<string, any>;

const educationSchema = z.object(educationFields);
const demos = new Set(["steady-tracks", "course-change"]);

describe("educational scenario metadata", () => {
  it("defaults optional education fields to a clear open-water scene", () => {
    expect(educationSchema.parse({})).toEqual({
      ruleIds: [],
      conditions: [],
      environment: { kind: "open", visibility: "clear" },
      events: [],
    });
  });

  it("rejects unsupported environments and invalid event timing", () => {
    expect(() =>
      educationSchema.parse({ environment: { kind: "harbour" } }),
    ).toThrow();
    expect(() =>
      educationSchema.parse({
        events: [{ time: -1, duration: 0, type: "sound", text: "bad" }],
      }),
    ).toThrow();
  });
});

describe("authored encounter library", () => {
  it('cites Rule 34 bend signals on the 2018 PDF pages 28–30',()=>{
    const pages=authored['../public/scenarios/channel-bend.json'].sources[0].pages;
    expect(pages).toMatch(/\b28\b/);
    expect(pages).toMatch(/\b30\b/);
  });
  const educationalEntries = index.filter((entry) => !demos.has(entry.id));

  it("keeps the two technical demonstrations and adds at least 20 lessons", () => {
    expect(index.filter((entry) => demos.has(entry.id))).toHaveLength(2);
    expect(educationalEntries.length).toBeGreaterThanOrEqual(20);
  });

  it("ships every indexed educational file as a draft with provenance", () => {
    for (const entry of educationalEntries) {
      const scenario = authored[`../public/scenarios/${entry.file}`];
      expect(scenario, entry.file).toBeDefined();
      expect(scenario.status, entry.file).toBe("draft");
      expect(scenario.ruleIds.length, entry.file).toBeGreaterThan(0);
      expect(entry.ruleIds, entry.file).toEqual(scenario.ruleIds);
      expect(scenario.conditions.length, entry.file).toBeGreaterThan(0);
      expect(scenario.sources.length, entry.file).toBeGreaterThan(0);
      expect(scenario.assumptions.join(" "), entry.file).toMatch(/illustrative/i);
      expect(educationSchema.parse(scenario)).toBeTruthy();
      expect(parseScenario(scenario).id).toBe(entry.id);
    }
  });

  it("covers all Rules 1–19 and the required environment families", () => {
    const scenarios = educationalEntries.map(
      (entry) => authored[`../public/scenarios/${entry.file}`],
    );
    const rules = new Set(scenarios.flatMap((scenario) => scenario.ruleIds));
    for (let rule = 1; rule <= 19; rule += 1)
      expect(rules.has(`rule-${rule}`), `Rule ${rule}`).toBe(true);
    expect(new Set(scenarios.map((scenario) => scenario.environment.kind))).toEqual(
      new Set(["open", "channel", "tss", "bend"]),
    );
    expect(scenarios.some((scenario) => scenario.environment.visibility === "restricted")).toBe(true);
  });

  it("keeps each straight track aligned with its authored heading", () => {
    for (const entry of educationalEntries) {
      const scenario = authored[`../public/scenarios/${entry.file}`];
      for (const vessel of scenario.vessels) {
        for (let i = 1; i < vessel.track.length; i += 1) {
          const a = vessel.track[i - 1];
          const b = vessel.track[i];
          const de = b.east - a.east;
          const dn = b.north - a.north;
          if (Math.hypot(de, dn) < 0.001) continue;
          const course = (Math.atan2(de, dn) * 180) / Math.PI;
          const normalized = (course + 360) % 360;
          const delta = Math.abs(((a.heading - normalized + 540) % 360) - 180);
          // Two-second turn samples move on the midpoint heading; endpoint
          // heading differs by at most half one small arc increment.
          expect(delta, `${entry.file}/${vessel.id} segment ${i}`).toBeLessThan(4);
        }
      }
    }
  });

  it("keeps events within the scenario and sound patterns within their duration", () => {
    for (const entry of educationalEntries) {
      const scenario = authored[`../public/scenarios/${entry.file}`];
      for (const event of scenario.events) {
        expect(event.time + event.duration, entry.file).toBeLessThanOrEqual(scenario.duration);
        if (event.pattern)
          expect(
            event.pattern.reduce((total: number, value: number) => total + value, 0),
            entry.file,
          ).toBeLessThanOrEqual(event.duration);
      }
    }
  });

  it("preserves illustrative hull clearance throughout every encounter", () => {
    for (const entry of educationalEntries) {
      const scenario = authored[`../public/scenarios/${entry.file}`];
      for (let time = 0; time <= scenario.duration; time += 1) {
        const poses = scenario.vessels.map((vessel: any) => ({
          vessel,
          pose: sampleTrack(vessel.track, time),
        }));
        for (let a = 0; a < poses.length; a += 1) {
          for (let b = a + 1; b < poses.length; b += 1) {
            const distance = Math.hypot(
              poses[a].pose.east - poses[b].pose.east,
              poses[a].pose.north - poses[b].pose.north,
            );
            const hullRadii =
              poses[a].vessel.length / 2 + poses[b].vessel.length / 2;
            expect(
              distance,
              `${entry.file} at ${time}s: ${poses[a].vessel.id}/${poses[b].vessel.id}`,
            ).toBeGreaterThan(hullRadii);
          }
        }
      }
    }
  });

  it("preserves hull clearance continuously between every pair of keyframes", () => {
    for (const entry of educationalEntries) {
      const scenario = authored[`../public/scenarios/${entry.file}`];
      for (let a = 0; a < scenario.vessels.length; a += 1) {
        for (let b = a + 1; b < scenario.vessels.length; b += 1) {
          const first = scenario.vessels[a];
          const second = scenario.vessels[b];
          const times = [...new Set([
            ...first.track.map((point: any) => point.time),
            ...second.track.map((point: any) => point.time),
          ])].sort((x: number, y: number) => x - y) as number[];
          const hullRadii = first.length / 2 + second.length / 2;
          for (let i = 1; i < times.length; i += 1) {
            const startA = sampleTrack(first.track, times[i - 1]);
            const endA = sampleTrack(first.track, times[i]);
            const startB = sampleTrack(second.track, times[i - 1]);
            const endB = sampleTrack(second.track, times[i]);
            const relativeStart = {
              east: startA.east - startB.east,
              north: startA.north - startB.north,
            };
            const relativeDelta = {
              east: endA.east - endB.east - relativeStart.east,
              north: endA.north - endB.north - relativeStart.north,
            };
            const deltaSquared = relativeDelta.east ** 2 + relativeDelta.north ** 2;
            const fraction = deltaSquared === 0
              ? 0
              : Math.max(0, Math.min(1, -(
                relativeStart.east * relativeDelta.east +
                relativeStart.north * relativeDelta.north
              ) / deltaSquared));
            const closest = Math.hypot(
              relativeStart.east + relativeDelta.east * fraction,
              relativeStart.north + relativeDelta.north * fraction,
            );
            expect(
              closest,
              `${entry.file}: ${first.id}/${second.id}, ${times[i - 1]}–${times[i]}s`,
            ).toBeGreaterThan(hullRadii);
          }
        }
      }
    }
  });

  it("authors Rule 18 operational status independently of hull model", () => {
    const expectedKinds = {
      "power-vs-fishing.json": "Vessel engaged in fishing",
      "power-vs-nuc.json": "Vessel not under command",
      "power-vs-ram.json": "Vessel restricted in ability to manoeuvre",
      "constrained-by-draught.json": "Vessel constrained by her draught",
    };
    for (const [file, kind] of Object.entries(expectedKinds)) {
      const scenario = authored[`../public/scenarios/${file}`];
      expect(scenario.vessels.find((vessel: any) => vessel.id === "special").kind).toBe(kind);
    }
  });

  it("shows the rule-specific action instead of only describing it", () => {
    const headings = (file: string, vesselId: string) =>
      authored[`../public/scenarios/${file}`].vessels
        .find((vessel: any) => vessel.id === vesselId)
        .track.map((point: any) => point.heading);
    expect(new Set(headings("head-on-powered.json", "own")).size).toBeGreaterThan(5);
    expect(new Set(headings("head-on-powered.json", "other")).size).toBeGreaterThan(5);
    expect(new Set(headings("crossing-give-way.json", "own")).size).toBeGreaterThan(5);
    expect(new Set(headings("crossing-give-way.json", "other")).size).toBe(1);
    expect(new Set(headings("sailing-opposite-tacks.json", "port-tack")).size).toBeGreaterThan(5);
    expect(new Set(headings("sailing-same-tack.json", "windward")).size).toBeGreaterThan(5);
    expect(new Set(headings("power-vs-fishing.json", "power")).size).toBeGreaterThan(5);
    expect(new Set(headings("stand-on-may-act.json", "own")).size).toBeGreaterThan(5);
    expect(new Set(headings("stand-on-shall-act.json", "own")).size).toBeGreaterThan(5);
  });

  it("takes overtaking vessels from astern to past and clear", () => {
    for (const file of ["overtake-starboard.json", "overtake-port.json"]) {
      const scenario = authored[`../public/scenarios/${file}`];
      const overtaking = scenario.vessels.find((vessel: any) => vessel.id === "overtaking");
      const overtaken = scenario.vessels.find((vessel: any) => vessel.id === "overtaken");
      expect(overtaking.track[0].north).toBeLessThan(overtaken.track[0].north);
      expect(overtaking.track.at(-1).north).toBeGreaterThan(
        overtaken.track.at(-1).north + (overtaking.length + overtaken.length) / 2,
      );
    }
  });

  it("joins the eastbound TSS lane at a small angle and reaches its centre", () => {
    const scenario = authored["../public/scenarios/tss-joining.json"];
    const joining = scenario.vessels.find((vessel: any) => vessel.id === "joining");
    expect(joining.track[0].heading).toBe(70);
    expect(joining.track.at(-1).north).toBeCloseTo(50, 0);
  });

  it("starts collision-rule examples on constant-bearing geometry before action", () => {
    const relativeBearing = (file: string, time: number) => {
      const scenario = authored[`../public/scenarios/${file}`];
      const own = scenario.vessels[0];
      const target = scenario.vessels[1];
      const a = sampleTrack(own.track, time);
      const b = sampleTrack(target.track, time);
      const absolute = (Math.atan2(b.east - a.east, b.north - a.north) * 180) / Math.PI;
      return (absolute - a.heading + 360) % 360;
    };
    for (const file of ["head-on-powered.json", "crossing-give-way.json"]) {
      expect(relativeBearing(file, 10)).toBeCloseTo(relativeBearing(file, 0), 1);
    }
  });

  it("shows the crossing give-way vessel passing astern after its alteration", () => {
    const scenario = authored["../public/scenarios/crossing-give-way.json"];
    const own = sampleTrack(scenario.vessels[0].track, 75);
    const standOn = sampleTrack(scenario.vessels[1].track, 75);
    expect(own.east).toBeGreaterThan(standOn.east);
    expect(own.north).toBeLessThan(standOn.north);
  });

  it("delays the compulsory Rule 17 action beyond the optional-action stage", () => {
    const firstAlteration = (file: string) => {
      const track = authored[`../public/scenarios/${file}`].vessels[0].track;
      return track.find((point: any) => point.heading !== track[0].heading).time;
    };
    expect(firstAlteration("stand-on-shall-act.json")).toBeGreaterThan(
      firstAlteration("stand-on-may-act.json"),
    );
  });

  it("completes the head-on pass with north order reversed", () => {
    const scenario = authored["../public/scenarios/head-on-powered.json"];
    const own = scenario.vessels.find((vessel: any) => vessel.id === "own");
    const other = scenario.vessels.find((vessel: any) => vessel.id === "other");
    expect(own.track[0].north).toBeLessThan(other.track[0].north);
    expect(own.track.at(-1).north).toBeGreaterThan(other.track.at(-1).north);
  });

  it("crosses both TSS lanes while traffic holds the eastbound lane", () => {
    const scenario = authored["../public/scenarios/tss-crossing.json"];
    const traffic = scenario.vessels.find((vessel: any) => vessel.id === "traffic");
    const crossing = scenario.vessels.find((vessel: any) => vessel.id === "crossing");
    expect(traffic.track.every((point: any) => point.north === 50)).toBe(true);
    expect(crossing.track[0].north).toBeLessThan(-150);
    expect(crossing.track.at(-1).north).toBeGreaterThan(350);
  });

  it("holds the channel crossing vessel outside until through traffic passes", () => {
    const scenario = authored["../public/scenarios/channel-crossing.json"];
    const crossing = scenario.vessels.find((vessel: any) => vessel.id === "crossing");
    const through = scenario.vessels.find((vessel: any) => vessel.id === "through");
    expect(sampleTrack(crossing.track, 56).east).toBe(-220);
    expect(sampleTrack(through.track, 56).north).toBeLessThan(0);
    expect(crossing.track.at(-1).east).toBeGreaterThan(150);
    expect(new Set(through.track.map((point: any) => point.heading))).toEqual(new Set([0]));
  });

  it("shows distinct restricted-visibility avoidance and slowing actions", () => {
    const ahead = authored["../public/scenarios/restricted-radar-ahead.json"];
    const abeam = authored["../public/scenarios/restricted-radar-abeam.json"];
    expect(ahead.vessels[0].track.at(-1).heading).toBe(60);
    expect(abeam.vessels[0].track.at(-1).east).toBeGreaterThan(0);

    const fog = authored["../public/scenarios/restricted-fog-signal.json"];
    const own = fog.vessels.find((vessel: any) => vessel.id === "own");
    const earlyDistance = sampleTrack(own.track, 20).north - sampleTrack(own.track, 10).north;
    const lateDistance = sampleTrack(own.track, 70).north - sampleTrack(own.track, 60).north;
    expect(lateDistance).toBeLessThan(earlyDistance / 2);
  });

  it("states Rule 18 duties with their vessel-specific qualifications", () => {
    expect(authored["../public/scenarios/power-vs-fishing.json"].summary).toMatch(/Rules 9, 10 and 13.*shall keep out/i);
    expect(authored["../public/scenarios/power-vs-nuc.json"].summary).toMatch(/power-driven vessel underway shall keep out/i);
    expect(authored["../public/scenarios/constrained-by-draught.json"].summary).toMatch(/other than one not under command or restricted.*if circumstances admit/i);
  });

  it("places the blind-bend vessels in separate waterway legs with reciprocal signals", () => {
    const scenario = authored["../public/scenarios/channel-bend.json"];
    const inWater = (point: any) =>
      (Math.abs(point.east) < 150 && point.north < 150) ||
      (point.east > -150 && Math.abs(point.north) < 150);
    for (const vessel of scenario.vessels)
      expect(vessel.track.every(inWater), vessel.id).toBe(true);

    const inbound = scenario.vessels.find((vessel: any) => vessel.id === "inbound");
    const outbound = scenario.vessels.find((vessel: any) => vessel.id === "outbound");
    expect(inbound.track[0]).toMatchObject({ east: 80, north: -340, heading: 0 });
    expect(outbound.track[0]).toMatchObject({ east: 340, north: 80, heading: 270 });

    // The initial line of sight crosses the south-east inner-corner land:
    // at north=-150 its east coordinate is greater than the bank at east=150.
    const fraction = (-150 - inbound.track[0].north) /
      (outbound.track[0].north - inbound.track[0].north);
    const sightlineEast = inbound.track[0].east +
      (outbound.track[0].east - inbound.track[0].east) * fraction;
    expect(sightlineEast).toBeGreaterThan(150);

    expect(scenario.ruleIds).toEqual(["rule-9", "rule-34"]);
    expect(scenario.events.filter((event: any) => event.type === "sound")).toMatchObject([
      { time: 18, duration: 5, pattern: [5], vesselId: "inbound" },
      { time: 26, duration: 5, pattern: [5], vesselId: "outbound" },
    ]);
  });
});
