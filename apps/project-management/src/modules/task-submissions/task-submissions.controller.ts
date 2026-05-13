import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { getInternalUser, isOrganizerOrManagerRole } from "../../lib/task-submission-access";

async function loadTaskWithProject(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, organizationId: true } } },
  });
}

function assertOrgScope(
  task: { project: { organizationId: string } },
  organizationId: string | null | undefined
): boolean {
  if (!organizationId) return false;
  return task.project.organizationId === organizationId;
}

function canSubmitForTask(
  task: { assigneeId: string | null },
  userId: string,
  role: string | undefined
): boolean {
  if (isOrganizerOrManagerRole(role)) return true;
  return task.assigneeId != null && task.assigneeId === userId;
}

export async function createTaskSubmissionHandler(req: Request, res: Response) {
  try {
    const internal = getInternalUser(req);
    if (!internal?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { taskId, body: textBody, attachments, status } = req.body as {
      taskId: string;
      body?: string;
      attachments?: unknown;
      status?: "DRAFT" | "SUBMITTED";
    };

    const task = await loadTaskWithProject(taskId);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!assertOrgScope(task, internal.organizationId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!canSubmitForTask(task, internal.id, internal.role)) {
      res.status(403).json({ error: "Only the assignee or an organizer/manager can submit work for this task" });
      return;
    }

    const nextVersion =
      ((
        await prisma.taskSubmission.aggregate({
          where: { taskId },
          _max: { version: true },
        })
      )._max.version ?? 0) + 1;

    const nextStatus = status === "SUBMITTED" ? "SUBMITTED" : "DRAFT";

    const row = await prisma.taskSubmission.create({
      data: {
        taskId,
        version: nextVersion,
        submittedById: internal.id,
        body: textBody ?? "",
        attachments: attachments === undefined ? undefined : (attachments as object),
        status: nextStatus,
        submittedAt: nextStatus === "SUBMITTED" ? new Date() : null,
      },
    });
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task submission" });
  }
}

export async function getTaskSubmissionsHandler(req: Request, res: Response) {
  try {
    const internal = getInternalUser(req);
    if (!internal?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { taskId, status } = req.query;
    if (!taskId || typeof taskId !== "string") {
      res.status(400).json({ error: "taskId query parameter is required" });
      return;
    }

    const task = await loadTaskWithProject(taskId);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (!assertOrgScope(task, internal.organizationId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const isReviewer = isOrganizerOrManagerRole(internal.role);
    const isAssignee = task.assigneeId === internal.id;
    if (!isReviewer && !isAssignee && task.creatorId !== internal.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const where: { taskId: string; status?: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED" | "CHANGES_REQUESTED" } = {
      taskId,
    };
    if (typeof status === "string" && status.length > 0) {
      where.status = status as typeof where.status;
    }

    const rows = await prisma.taskSubmission.findMany({
      where,
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task submissions" });
  }
}

export async function getTaskSubmissionByIdHandler(req: Request, res: Response) {
  try {
    const internal = getInternalUser(req);
    if (!internal?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const row = await prisma.taskSubmission.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: { select: { organizationId: true } } } } },
    });
    if (!row) {
      res.status(404).json({ error: "Task submission not found" });
      return;
    }
    if (!assertOrgScope(row.task, internal.organizationId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const isReviewer = isOrganizerOrManagerRole(internal.role);
    const isAssignee = row.task.assigneeId === internal.id;
    if (!isReviewer && !isAssignee && row.submittedById !== internal.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { task: _t, ...rest } = row;
    res.json(rest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task submission" });
  }
}

export async function updateTaskSubmissionHandler(req: Request, res: Response) {
  try {
    const internal = getInternalUser(req);
    if (!internal?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const existing = await prisma.taskSubmission.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: { select: { organizationId: true } } } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Task submission not found" });
      return;
    }
    if (!assertOrgScope(existing.task, internal.organizationId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (existing.submittedById !== internal.id) {
      res.status(403).json({ error: "Only the submitter can edit this submission" });
      return;
    }
    if (existing.status !== "DRAFT") {
      res.status(409).json({ error: "Only draft submissions can be updated" });
      return;
    }

    const patch = req.body as { body?: string; attachments?: unknown | null; status?: "DRAFT" | "SUBMITTED" };
    const nextStatus = patch.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT";

    const updated = await prisma.taskSubmission.update({
      where: { id: existing.id },
      data: {
        ...(patch.body !== undefined ? { body: patch.body } : {}),
        ...(patch.attachments !== undefined
          ? { attachments: patch.attachments === null ? null : (patch.attachments as object) }
          : {}),
        status: nextStatus,
        submittedAt: nextStatus === "SUBMITTED" ? new Date() : existing.submittedAt,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task submission" });
  }
}

export async function reviewTaskSubmissionHandler(req: Request, res: Response) {
  try {
    const internal = getInternalUser(req);
    if (!internal?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!isOrganizerOrManagerRole(internal.role)) {
      res.status(403).json({ error: "Only an organizer or manager can review submissions" });
      return;
    }

    const { status: reviewStatus, reviewNote } = req.body as {
      status: "ACCEPTED" | "REJECTED" | "CHANGES_REQUESTED";
      reviewNote?: string | null;
    };

    if (reviewStatus === "ACCEPTED" && internal.role?.toLowerCase() !== "organizer") {
      res.status(403).json({ error: "Only an organizer can accept submissions" });
      return;
    }

    const existing = await prisma.taskSubmission.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: { select: { organizationId: true } } } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Task submission not found" });
      return;
    }
    if (!assertOrgScope(existing.task, internal.organizationId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (existing.status !== "SUBMITTED") {
      res.status(409).json({ error: "Only submitted work can be reviewed" });
      return;
    }

    const updated = await prisma.taskSubmission.update({
      where: { id: existing.id },
      data: {
        status: reviewStatus,
        reviewedAt: new Date(),
        reviewedById: internal.id,
        reviewNote: reviewNote ?? null,
      },
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to review task submission" });
  }
}
