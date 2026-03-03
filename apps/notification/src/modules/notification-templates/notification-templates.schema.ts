import { z } from "zod";
export const notificationTemplatesSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateNotificationTemplatesSchema = z.object({
  body: notificationTemplatesSchema.shape.body.partial()
});
