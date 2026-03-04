import { z } from "zod";

export const messageAttachmentSchema = z.object({
      body: z.object({
        messageId: z.string().min(1),
        url: z.string().min(1),
        fileType: z.string().min(1),
      })
    });
