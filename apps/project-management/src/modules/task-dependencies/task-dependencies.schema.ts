import { z } from "zod";

export const taskDependencySchema = z.object({
      body: z.object({
        taskId: z.string().min(1),
        dependsOnId: z.string().min(1),
        type: z.string().min(1),
      })
    });
export const updateTaskDependencySchema = z.object({
      body: taskDependencySchema.shape.body.partial()
    });
