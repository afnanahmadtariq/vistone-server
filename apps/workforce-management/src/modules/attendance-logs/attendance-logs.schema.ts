import { z } from "zod";

export const purgeAttendanceForUserSchema = z.object({
  body: z
    .object({
      userId: z.string().min(1),
      organizationId: z.string().min(1),
    })
    .strict(),
});

export const clockInAttendanceSchema = z.object({
  body: z
    .object({
      organizationId: z.string().min(1),
    })
    .strict(),
});

export const clockOutAttendanceSchema = z.object({
  body: z
    .object({
      organizationId: z.string().min(1),
      logId: z.string().min(1).optional(),
    })
    .strict(),
});
