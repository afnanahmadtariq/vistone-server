import { z } from "zod";

export const documentPermissionsSchema = z.object({
  body: z.object({}).passthrough()
});

export const updateDocumentPermissionsSchema = z.object({
  body: documentPermissionsSchema.shape.body.partial()
});
