import { z } from "zod";

export const projectSchema = z.object({
      body: z.object({
        organizationId: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        status: z.string().min(1),
        startDate: z.string().or(z.date()).nullable().optional(),
        endDate: z.string().or(z.date()).nullable().optional(),
        budget: z.number().nullable().optional(),
        spentBudget: z.number().nullable().optional(),
        progress: z.number().min(0).max(100).nullable().optional(),
        clientId: z.string().nullable().optional(),
        managerId: z.string().nullable().optional(),
        teamIds: z.array(z.string()).nullable().optional(),
        metadata: z.any().nullable().optional(),
      })
    });
export const updateProjectSchema = z.object({
      body: projectSchema.shape.body.partial()
    });
