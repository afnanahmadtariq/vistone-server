import { z } from "zod";

export const documentFoldersSchema = z.object({
  body: z.object({}).passthrough()
});

export const updateDocumentFoldersSchema = z.object({
  body: documentFoldersSchema.shape.body.partial()
});
