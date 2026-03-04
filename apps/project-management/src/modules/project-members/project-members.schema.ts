import { z } from "zod";

export const projectMemberSchema = z.object({
      body: z.object({
        projectId: z.string().min(1),
        userId: z.string().min(1),
        role: z.string().nullable().optional(),
      })
    });
export const updateProjectMemberSchema = z.object({
      body: projectMemberSchema.shape.body.partial()
    });
