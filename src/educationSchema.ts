import { z } from "zod";

export const educationFields = {
  ruleIds: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  environment: z
    .object({
      kind: z.enum(["open", "channel", "tss", "bend"]).default("open"),
      visibility: z.enum(["clear", "restricted"]).default("clear"),
      windFrom: z.number().optional(),
    })
    .default({ kind: "open", visibility: "clear" }),
  events: z
    .array(
      z.object({
        time: z.number().nonnegative(),
        duration: z.number().positive(),
        type: z.enum(["sound", "light", "annotation"]),
        pattern: z.array(z.number().positive()).optional(),
        text: z.string(),
        vesselId: z.string().optional(),
      }),
    )
    .default([]),
};
