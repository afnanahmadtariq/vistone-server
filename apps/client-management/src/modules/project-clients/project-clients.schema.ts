import { z } from "zod";

export const projectClientSchema = z.object({
      body: z.object({
        projectId: z.string().min(1),
        clientId: z.string().min(1),
      })
    });
export const updateProjectClientSchema = z.object({
      body: projectClientSchema.shape.body.partial()
    });
