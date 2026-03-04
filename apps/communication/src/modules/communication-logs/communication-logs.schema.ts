import { z } from "zod";

export const communicationLogSchema = z.object({
      body: z.object({
        type: z.string().min(1),
        details: z.any(),
      })
    });
