import { z } from "zod";

export const documentLinksSchema = z.object({
  body: z.object({}).passthrough()
});

export const updateDocumentLinksSchema = z.object({
  body: documentLinksSchema.shape.body.partial()
});
