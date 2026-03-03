import { z } from "zod";
export const kpiDefinitionsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateKpiDefinitionsSchema = z.object({
  body: kpiDefinitionsSchema.shape.body.partial()
});
