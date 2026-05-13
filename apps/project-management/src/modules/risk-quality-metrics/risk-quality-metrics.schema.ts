import { z } from "zod";

export const upsertRiskQualityMetricsSchema = z.object({
  params: z.object({
    projectId: z.string().min(1),
  }),
  body: z.object({
    inputs: z.record(z.string(), z.any()),
  }),
});
