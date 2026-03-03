import { z } from "zod";

export const taskChecklistSchema = z.object({
      body: z.object({
        taskId: z.string().min(1),
        item: z.string().min(1),
        isCompleted: z.boolean().nullable().optional(),
      })
    });
export const updateTaskChecklistSchema = z.object({
      body: taskChecklistSchema.shape.body.partial()
    });
