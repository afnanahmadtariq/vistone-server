import { z } from "zod";
export const automationRulesSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateAutomationRulesSchema = z.object({
  body: automationRulesSchema.shape.body.partial()
});
