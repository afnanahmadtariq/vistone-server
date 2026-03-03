import { z } from "zod";

export const aiInsightSchema = z.object({
      body: z.object({
        projectId: z.string().nullable().optional(),
        taskId: z.string().nullable().optional(),
        content: z.string().min(1),
        confidence: z.number().nullable().optional(),
        actionable: z.boolean().nullable().optional(),
      })
    });
