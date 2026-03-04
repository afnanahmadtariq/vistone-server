import { z } from "zod";
export const aiConversationsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateAiConversationsSchema = z.object({
  body: aiConversationsSchema.shape.body.partial()
});
