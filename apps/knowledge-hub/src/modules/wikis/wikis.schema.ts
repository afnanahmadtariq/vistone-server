import { z } from 'zod';

export const createWikiSchema = z.object({
    body: z.object({
        organizationId: z.string().min(1),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })
});

export const updateWikiSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    })
});
