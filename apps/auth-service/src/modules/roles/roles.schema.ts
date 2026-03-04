import { z } from 'zod';

export const roleSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        organizationId: z.string().nullable().optional(),
        permissions: z.record(z.string(), z.array(z.string())).nullable().optional(),
        isSystem: z.boolean().nullable().optional(),
    })
});

export const updateRoleSchema = z.object({
    body: roleSchema.shape.body.partial()
});
