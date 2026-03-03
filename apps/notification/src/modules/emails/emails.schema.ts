import { z } from "zod";
export const emailsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateEmailsSchema = z.object({
  body: emailsSchema.shape.body.partial()
});
