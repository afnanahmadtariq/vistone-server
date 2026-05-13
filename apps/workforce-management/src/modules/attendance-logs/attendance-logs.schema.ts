import { z } from "zod";

export const createAttendanceLogSchema = z.object({
  body: z
    .object({
      organizationId: z.string().min(1),
      workDate: z.string().min(1),
      hoursWorked: z.coerce.number().nonnegative().max(24),
      notes: z.string().nullable().optional(),
    })
    .strict(),
});

export const updateAttendanceLogSchema = z.object({
  body: z
    .object({
      workDate: z.string().min(1).optional(),
      hoursWorked: z.coerce.number().nonnegative().max(24).optional(),
      notes: z.string().nullable().optional(),
    })
    .strict(),
});

export const purgeAttendanceForUserSchema = z.object({
  body: z
    .object({
      userId: z.string().min(1),
      organizationId: z.string().min(1),
    })
    .strict(),
});
