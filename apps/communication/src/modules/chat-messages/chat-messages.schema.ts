import { z } from "zod";

export const chatMessageSchema = z.object({
      body: z.object({
        channelId: z.string().min(1),
        senderId: z.string().min(1),
        content: z.string().min(1),
      })
    });
export const updateChatMessageSchema = z.object({
      body: chatMessageSchema.shape.body.partial()
    });
