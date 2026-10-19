import { z } from "zod";
const finite = z.number().finite();
const pointSchema = z.object({
  time: finite.nonnegative(),
  east: finite,
  north: finite,
  heading: finite.min(0).lt(360),
});
const scenarioSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    status: z.enum(["technical-demo", "draft", "reviewed"]),
    duration: finite.positive(),
    assumptions: z.array(z.string()),
    sources: z.array(
      z.object({
        title: z.string().min(1),
        pages: z.string().min(1),
        figure: z.string().optional(),
        rule: z.string().optional(),
      }),
    ),
    vessels: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          length: finite.min(5).max(300),
          model: z
            .string()
            .regex(/^[a-zA-Z0-9_./-]+\.glb$/)
            .optional(),
          track: z.array(pointSchema).min(2),
        }),
      )
      .min(1)
      .max(8),
    steps: z
      .array(
        z.object({
          time: finite.nonnegative(),
          title: z.string().min(1),
          body: z.string().min(1),
        }),
      )
      .min(1),
  })
  .superRefine((s, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (new Set(s.vessels.map((v) => v.id)).size !== s.vessels.length)
      issue("Vessel IDs must be unique.");
    for (const v of s.vessels) {
      if (v.track[0].time !== 0 || v.track.at(-1)!.time !== s.duration)
        issue(`${v.name}: track must span the complete duration.`);
      if (v.track.some((p, i) => i > 0 && p.time <= v.track[i - 1].time))
        issue(`${v.name}: track times must increase.`);
    }
    if (
      s.steps[0].time !== 0 ||
      s.steps.some(
        (p, i) =>
          p.time > s.duration || (i > 0 && p.time <= s.steps[i - 1].time),
      )
    )
      issue("Steps must start at zero and increase within duration.");
    if (s.status === "reviewed" && s.sources.length === 0)
      issue("Reviewed content needs a source.");
  });
export type Scenario = z.infer<typeof scenarioSchema>;
export type TrackPoint = z.infer<typeof pointSchema>;
export type Pose = Omit<TrackPoint, "time">;
export function parseScenario(input: unknown): Scenario {
  return scenarioSchema.parse(input);
}
export function sampleTrack(track: TrackPoint[], time: number): Pose {
  const t = Math.max(track[0].time, Math.min(time, track.at(-1)!.time));
  let i = track.findIndex((p) => p.time >= t);
  if (i <= 0) i = 1;
  const a = track[i - 1],
    b = track[i],
    f = (t - a.time) / (b.time - a.time);
  const delta = ((b.heading - a.heading + 540) % 360) - 180;
  return {
    east: a.east + (b.east - a.east) * f,
    north: a.north + (b.north - a.north) * f,
    heading: (((a.heading + delta * f) % 360) + 360) % 360,
  };
}
export function advanceClock(
  time: number,
  delta: number,
  speed: number,
  duration: number,
) {
  const next = Math.min(duration, Math.max(0, time + delta * speed));
  return { time: next, playing: next < duration };
}
// Bow is local -Z. North is scene -Z and east is +X.
export function toScene(p: Pose) {
  return { x: p.east, z: -p.north, rotation: (-p.heading * Math.PI) / 180 };
}

const librarySchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      file: z.string().regex(/^[-a-z0-9]+\.json$/),
      title: z.string().trim().min(1),
      subtitle: z.string().trim().min(1),
      duration: finite.positive(),
    }),
  )
  .min(1)
  .refine(
    (entries) => new Set(entries.map((e) => e.id)).size === entries.length,
    "Library IDs must be unique.",
  );
export type LibraryEntry = z.infer<typeof librarySchema>[number];
export function parseLibrary(input: unknown): LibraryEntry[] {
  return librarySchema.parse(input);
}
