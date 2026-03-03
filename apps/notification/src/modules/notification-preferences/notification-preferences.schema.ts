import { z } from "zod";
export const notificationPreferencesSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateNotificationPreferencesSchema = z.object({
  body: notificationPreferencesSchema.shape.body.partial()
});
