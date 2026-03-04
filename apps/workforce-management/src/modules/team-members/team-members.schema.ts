import { z } from "zod";
export const teamMembersSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateTeamMembersSchema = z.object({
  body: teamMembersSchema.shape.body.partial()
});
