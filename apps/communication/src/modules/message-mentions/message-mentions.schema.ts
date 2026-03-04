import { z } from "zod";

export const messageMentionSchema = z.object({
      body: z.object({
        messageId: z.string().min(1),
        userId: z.string().min(1),
      })
    });
