import { z } from "zod";

export const wikiPageVersionsSchema = z.object({
  body: z.object({}).passthrough()
});

export const updateWikiPageVersionsSchema = z.object({
  body: wikiPageVersionsSchema.shape.body.partial()
});
