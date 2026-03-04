import { z } from "zod";

export const organizationMemberSchema = z.object({
      body: z.object({
        organizationId: z.string().min(1),
        userId: z.string().min(1),
        roleId: z.string().nullable().optional(),
      })
    });
export const updateOrganizationMemberSchema = z.object({
      body: organizationMemberSchema.shape.body.partial()
    });
