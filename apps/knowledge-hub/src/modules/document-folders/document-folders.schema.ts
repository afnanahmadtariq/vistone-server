import { z } from "zod";

export const documentFoldersSchema = z.object({
  body: z.object({
    wikiId: z.string().min(1, "wikiId is required"),
    name: z.string().min(1, "name is required").max(100),
    parentId: z.string().nullable().optional(),
  })
});

export const updateDocumentFoldersSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    parentId: z.string().nullable().optional(),
  })
});
