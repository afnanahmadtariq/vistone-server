import { z } from "zod";

export const reportScheduleSchema = z.object({
    body: z.object({
        organizationId: z.string().min(1),
        templateId: z.string().nullable().optional(),
        name: z.string().min(1),
        cronExpression: z.string().min(1).optional(),
        recipients: z.array(z.string().email()).optional(),
        format: z.enum(['pdf', 'csv', 'excel']).optional(),
        filters: z.any().nullable().optional(),
        isActive: z.boolean().optional(),
    })
});

export const updateReportScheduleSchema = z.object({
    body: reportScheduleSchema.shape.body.partial()
});
