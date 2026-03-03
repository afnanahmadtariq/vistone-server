import { z } from "zod";

export const riskRegisterSchema = z.object({
      body: z.object({
        projectId: z.string().min(1),
        description: z.string().min(1),
        probability: z.string().nullable().optional(),
        impact: z.string().nullable().optional(),
        mitigationPlan: z.string().nullable().optional(),
        status: z.string().min(1),
      })
    });
export const updateRiskRegisterSchema = z.object({
      body: riskRegisterSchema.shape.body.partial()
    });
