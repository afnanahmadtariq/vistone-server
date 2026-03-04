import { z } from "zod";
export const memberPerformanceSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateMemberPerformanceSchema = z.object({
  body: memberPerformanceSchema.shape.body.partial()
});
