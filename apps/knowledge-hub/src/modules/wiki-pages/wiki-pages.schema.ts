import { z } from "zod";

export const wikiPagesSchema = z.object({
  body: z.object({}).passthrough()
});

export const updateWikiPagesSchema = z.object({
  body: wikiPagesSchema.shape.body.partial()
});
