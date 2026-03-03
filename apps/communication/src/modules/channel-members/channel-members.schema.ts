import { z } from "zod";

export const channelMemberSchema = z.object({
      body: z.object({
        channelId: z.string().min(1),
        userId: z.string().min(1),
      })
    });
export const updateChannelMemberSchema = z.object({
      body: channelMemberSchema.shape.body.partial()
    });
