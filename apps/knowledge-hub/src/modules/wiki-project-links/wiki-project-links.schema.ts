import { z } from 'zod';

export const createLinkSchema = z.object({
    body: z.object({
        wikiId: z.string().min(1, "wikiId is required"),
        projectId: z.string().min(1, "projectId is required"),
    })
});
