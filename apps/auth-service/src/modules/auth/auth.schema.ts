import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })
});
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    organizationName: z.string().nullable().optional(),
  })
});
export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
  })
});
export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  })
});
export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(6).optional(),
    name: z.string().min(1).optional(),
    role: z.string().nullable().optional(),
  })
});
