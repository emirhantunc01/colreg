import { z } from "zod";

const point = z.object({
  time: z.number().finite().nonnegative(),
  x: z.number().finite().min(0).max(220),
  y: z.number().finite().min(0).max(120),
  heading: z.number().finite().min(0).lt(360),
});
const geographyPoint = z.object({ x: z.number().finite(), y: z.number().finite() });
const geographySchema = z.object({
  areas: z.array(z.object({ kind: z.enum(["land", "divider"]), points: z.array(geographyPoint).min(3) })),
  lines: z.array(z.object({ kind: z.enum(["shore", "lane"]), points: z.array(geographyPoint).min(2) })),
  arrows: z.array(z.object({ kind: z.enum(["channel", "traffic"]), from: geographyPoint, to: geographyPoint })),
});

export const previewSchema = z.object({
  width: z.literal(220),
  height: z.literal(120),
  duration: z.number().finite().positive(),
  tracks: z.array(z.object({
    id: z.string().min(1),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    length: z.number().finite().positive(),
    route: z.array(point).min(1),
  })).min(1),
  environment: z.object({
    kind: z.string().min(1),
    visibility: z.enum(["clear", "restricted"]),
    windFrom: z.number().finite().min(0).lt(360).optional(),
  }),
  geography: geographySchema,
  conditions: z.array(z.string()),
  stages: z.array(z.object({
    time: z.number().finite().nonnegative(),
    title: z.string(),
    body: z.string(),
  })),
});

export type Preview = z.infer<typeof previewSchema>;
