import { z } from "zod";
export const notificationsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateNotificationsSchema = z.object({
  body: notificationsSchema.shape.body.partial()
});
