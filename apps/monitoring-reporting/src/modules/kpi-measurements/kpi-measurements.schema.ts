import { z } from "zod";
export const kpiMeasurementsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateKpiMeasurementsSchema = z.object({
  body: kpiMeasurementsSchema.shape.body.partial()
});
