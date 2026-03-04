import { z } from "zod";
export const dashboardWidgetsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateDashboardWidgetsSchema = z.object({
  body: dashboardWidgetsSchema.shape.body.partial()
});
