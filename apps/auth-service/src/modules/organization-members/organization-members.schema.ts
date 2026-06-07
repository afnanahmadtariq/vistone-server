import { z } from "zod";

const memberKindEnum = z.enum(["ORGANIZER", "MANAGER", "CONTRIBUTOR", "CLIENT"]);

export const organizationMemberSchema = z.object({
      body: z.object({
        organizationId: z.string().min(1),
        userId: z.string().min(1),
        roleId: z.string().nullable().optional(),
        memberKind: memberKindEnum.optional(),
      })
    });
export const updateOrganizationMemberSchema = z.object({
      body: organizationMemberSchema.shape.body.partial()
    });
