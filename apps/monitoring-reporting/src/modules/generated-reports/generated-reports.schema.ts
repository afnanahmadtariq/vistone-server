import { z } from "zod";
export const generatedReportsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateGeneratedReportsSchema = z.object({
  body: generatedReportsSchema.shape.body.partial()
});
