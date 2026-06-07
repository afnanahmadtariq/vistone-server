import { z } from "zod";

const attachmentItem = z.object({
  url: z.string().url(),
  filename: z.string().min(1),
  contentType: z.string().optional(),
  size: z.number().optional(),
});

export const createTaskSubmissionSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    body: z.string().optional().default(""),
    attachments: z.array(attachmentItem).optional(),
    status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
  }),
});

export const updateTaskSubmissionSchema = z.object({
  body: z.object({
    body: z.string().optional(),
    attachments: z.array(attachmentItem).optional().nullable(),
    status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
  }),
});

export const reviewTaskSubmissionSchema = z.object({
  body: z.object({
    status: z.enum(["ACCEPTED", "REJECTED", "CHANGES_REQUESTED"]),
    reviewNote: z.string().optional().nullable(),
  }),
});
