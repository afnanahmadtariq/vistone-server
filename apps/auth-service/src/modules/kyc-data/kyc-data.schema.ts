import { z } from "zod";

export const kycDataSchema = z.object({
      body: z.object({
        userId: z.string().min(1),
        status: z.string().min(1),
        documents: z.any().nullable().optional(),
        verifiedAt: z.string().or(z.date()).nullable().optional(),
      })
    });
export const updateKycDataSchema = z.object({
      body: kycDataSchema.shape.body.partial()
    });
