import { z } from "zod";

export const clientFeedbackSchema = z.object({
      body: z.object({
        clientId: z.string().min(1),
        projectId: z.string().nullable().optional(),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        comment: z.string().nullable().optional(),
        response: z.string().nullable().optional(),
      })
    });
export const updateClientFeedbackSchema = z.object({
      body: clientFeedbackSchema.shape.body.partial()
    });
