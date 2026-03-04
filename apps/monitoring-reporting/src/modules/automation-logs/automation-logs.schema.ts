import { z } from "zod";
export const automationLogsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateAutomationLogsSchema = z.object({
  body: automationLogsSchema.shape.body.partial()
});
