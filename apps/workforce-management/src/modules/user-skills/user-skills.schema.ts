import { z } from "zod";
export const userSkillsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateUserSkillsSchema = z.object({
  body: userSkillsSchema.shape.body.partial()
});
