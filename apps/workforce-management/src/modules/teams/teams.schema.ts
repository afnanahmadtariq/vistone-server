import { z } from "zod";
export const teamsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateTeamsSchema = z.object({
  body: teamsSchema.shape.body.partial()
});
