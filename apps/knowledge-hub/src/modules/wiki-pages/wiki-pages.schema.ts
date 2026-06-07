import { z } from "zod";

export const createWikiPageSchema = z.object({
  body: z.object({
    wikiId: z.string().min(1, "wikiId is required"),
    title: z.string().min(1, "title is required"),
    content: z.string().optional().nullable(),
    parentId: z.string().nullable().optional(),
  })
});

export const updateWikiPageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional().nullable(),
    parentId: z.string().nullable().optional(),
  })
});
