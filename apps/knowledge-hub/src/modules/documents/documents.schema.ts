import { z } from "zod";

export const documentsSchema = z.object({
  body: z.object({}).passthrough()
});

export const updateDocumentsSchema = z.object({
  body: documentsSchema.shape.body.partial()
});
