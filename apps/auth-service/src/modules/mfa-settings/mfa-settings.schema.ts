import { z } from "zod";

export const mfaSettingSchema = z.object({
      body: z.object({
        userId: z.string().min(1),
        enabled: z.boolean().nullable().optional(),
        secret: z.string().nullable().optional(),
        backupCodes: z.array(z.string()).nullable().optional(),
      })
    });
export const updateMfaSettingSchema = z.object({
      body: mfaSettingSchema.shape.body.partial()
    });
