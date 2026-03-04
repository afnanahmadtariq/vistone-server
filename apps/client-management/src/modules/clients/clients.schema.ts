import { z } from "zod";

export const clientSchema = z.object({
      body: z.object({
        organizationId: z.string().nullable().optional(),
        name: z.string().min(1),
        email: z.string().email().nullable().optional(),
        company: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        industry: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        contactInfo: z.any().nullable().optional(),
        portalAccess: z.boolean().nullable().optional(),
        contactPersonId: z.string().nullable().optional(),
      })
    });
export const updateClientSchema = z.object({
      body: clientSchema.shape.body.partial()
    });
