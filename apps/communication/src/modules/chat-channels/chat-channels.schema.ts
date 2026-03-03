import { z } from "zod";

export const chatChannelSchema = z.object({
      body: z.object({
        projectId: z.string().nullable().optional(),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        type: z.string().min(1),
      })
    });
export const updateChatChannelSchema = z.object({
      body: chatChannelSchema.shape.body.partial()
    });
