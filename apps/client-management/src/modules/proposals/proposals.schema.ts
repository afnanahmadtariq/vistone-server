import { z } from "zod";

export const proposalSchema = z.object({
      body: z.object({
        clientId: z.string().min(1),
        title: z.string().min(1),
        content: z.string().nullable().optional(),
        status: z.string().min(1),
      })
    });
export const updateProposalSchema = z.object({
      body: proposalSchema.shape.body.partial()
    });
