import { z } from "zod";

export const chatChannelSchema = z.object({
  body: z.object({
    organizationId: z.string().min(1),
    name: z.string().min(1).optional().nullable(),
    description: z.string().nullable().optional(),
    type: z.string().min(1),
    projectId: z.string().nullable().optional(),
    createdBy: z.string().min(1),
    memberIds: z.array(z.string()).optional().default([]),
  }),
});

export const updateChatChannelSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    isArchived: z.boolean().optional(),
  }),
});
