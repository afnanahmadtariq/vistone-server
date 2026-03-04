import { z } from "zod";

export const userSchema = z.object({
      body: z.object({
        email: z.string().email(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        password: z.string().nullable().optional(),
        googleId: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
      })
    });
export const updateUserSchema = z.object({
      body: userSchema.shape.body.partial()
    });
