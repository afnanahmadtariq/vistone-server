import { z } from "zod";

export const activityLogSchema = z.object({
      body: z.object({
        userId: z.string().nullable().optional(),
        action: z.string().min(1),
        entityType: z.string().min(1),
        entityId: z.string().nullable().optional(),
        metadata: z.any().nullable().optional(),
        ipAddress: z.string().nullable().optional(),
        userAgent: z.string().nullable().optional(),
      })
    });
