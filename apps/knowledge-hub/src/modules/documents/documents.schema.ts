import { z } from 'zod';

export const createDocumentSchema = z.object({
  body: z.object({
    organizationId: z.string().min(1),
    wikiId: z.string().min(1),
    folderId: z.string().nullable().optional(),
    name: z.string().min(1),
    url: z.string().url("Must be a valid URL"),
    metadata: z.any().optional(),
  })
});

export const updateDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    folderId: z.string().nullable().optional(),
    name: z.string().min(1).optional(),
    url: z.string().url("Must be a valid URL").optional(),
    metadata: z.any().optional(),
  })
});
