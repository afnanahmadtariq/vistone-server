import { z } from "zod";

export const milestoneSchema = z.object({
      body: z.object({
        projectId: z.string().min(1),
        title: z.string().optional(),
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        dueDate: z.string().or(z.date()).nullable().optional(),
        status: z.string().nullable().optional(),
        completed: z.boolean().nullable().optional(),
        completedAt: z.string().or(z.date()).nullable().optional(),
      }).refine(data => data.title || data.name, {
        message: "Title or name is required",
        path: ["title"]
      })
    });
export const updateMilestoneSchema = z.object({
      body: z.object({
        projectId: z.string().optional(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        dueDate: z.string().or(z.date()).nullable().optional(),
        status: z.string().optional(),
        completed: z.boolean().optional(),
        completedAt: z.string().or(z.date()).nullable().optional(),
      })
    });
