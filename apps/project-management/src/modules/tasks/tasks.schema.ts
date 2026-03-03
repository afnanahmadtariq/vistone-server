import { z } from "zod";

export const taskSchema = z.object({
      body: z.object({
        projectId: z.string().min(1),
        parentId: z.string().nullable().optional(),
        assigneeId: z.string().nullable().optional(),
        creatorId: z.string().nullable().optional(),
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        status: z.string().min(1),
        priority: z.string().nullable().optional(),
        dueDate: z.string().or(z.date()).nullable().optional(),
        startDate: z.string().or(z.date()).nullable().optional(),
        estimatedHours: z.number().nullable().optional(),
        actualHours: z.number().nullable().optional(),
        aiSuggestions: z.any().nullable().optional(),
      })
    });
export const updateTaskSchema = z.object({
      body: taskSchema.shape.body.partial()
    });
