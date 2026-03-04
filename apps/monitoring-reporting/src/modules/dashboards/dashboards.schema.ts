import { z } from "zod";
export const dashboardsSchema = z.object({
  body: z.object({
    // TODO: Add strict types based on your Prisma models
  }).passthrough()
});

export const updateDashboardsSchema = z.object({
  body: dashboardsSchema.shape.body.partial()
});
