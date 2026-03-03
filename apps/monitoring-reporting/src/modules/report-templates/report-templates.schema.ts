import { z } from "zod";
export const reportTemplatesSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateReportTemplatesSchema = z.object({
  body: reportTemplatesSchema.shape.body.partial()
});
