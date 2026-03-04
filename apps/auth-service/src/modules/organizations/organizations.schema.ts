import { z } from "zod";

export const organizationSchema = z.object({
      body: z.object({
        name: z.string().min(1),
        slug: z.string().nullable().optional(),
        settings: z.any().nullable().optional(),
      })
    });
export const updateOrganizationSchema = z.object({
      body: organizationSchema.shape.body.partial()
    });
