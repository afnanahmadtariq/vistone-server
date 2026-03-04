import { z } from "zod";
export const userAvailabilitySchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateUserAvailabilitySchema = z.object({
  body: userAvailabilitySchema.shape.body.partial()
});
