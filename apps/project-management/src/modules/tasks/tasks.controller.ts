import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { syncMilestoneWorkflowForMilestoneId } from "../../lib/milestone-task-sync";

async function assertMilestoneBelongsToProject(
  milestoneId: string | null | undefined,
  projectId: string,
  res: Response,
): Promise<boolean> {
  if (milestoneId == null || milestoneId === "") return true;
  const m = await prisma.milestone.findFirst({
    where: { id: milestoneId, projectId },
  });
  if (!m) {
    res.status(400).json({ error: "Milestone not found for this project" });
    return false;
  }
  return true;
}

function milestoneIdsToResync(
  previous: string | null | undefined,
  next: string | null | undefined,
): string[] {
  const ids = new Set<string>();
  if (previous) ids.add(previous);
  if (next) ids.add(next);
  return [...ids];
}

export async function createTaskHandler(req: Request, res: Response) {
  try {
    const data: Record<string, unknown> = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
    if (data.startDate) data.startDate = new Date(data.startDate as string);
    if (data.milestoneId === "") data.milestoneId = null;
    if (
      data.priority === undefined ||
      data.priority === null ||
      (typeof data.priority === "string" && !data.priority.trim())
    ) {
      data.priority = "Medium";
    }

    const projectId = data.projectId as string;
    if (!(await assertMilestoneBelongsToProject(data.milestoneId as string | null, projectId, res))) {
      return;
    }

    const task = await prisma.task.create({
      data: data as Parameters<typeof prisma.task.create>[0]["data"],
    });

    if (task.milestoneId) {
      await syncMilestoneWorkflowForMilestoneId(task.milestoneId);
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task" });
  }
}

export async function getAllTasksHandler(req: Request, res: Response) {
  try {
    const { projectId, assigneeId, status, priority, parentId } = req.query;
    const where: Record<string, unknown> = {};

    if (projectId) where.projectId = projectId as string;
    if (assigneeId) where.assigneeId = assigneeId as string;
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;
    if (parentId) {
      where.parentId = parentId as string;
    } else if (parentId === undefined && !req.query.includeSubtasks) {
      // By default, only return top-level tasks (no subtasks) unless explicitly requested
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        checklists: true,
        subtasks: { select: { id: true, title: true, status: true } },
        submissions: { orderBy: { version: "desc" }, take: 20 },
        _count: { select: { subtasks: true, checklists: true, dependencies: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
}

export async function getTaskByIdHandler(req: Request, res: Response) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        subtasks: {
          include: { checklists: true },
          orderBy: { createdAt: "asc" },
        },
        checklists: { orderBy: { createdAt: "asc" } },
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        dependentOn: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        submissions: { orderBy: { version: "desc" } },
        aiInsights: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
}

export async function updateTaskHandler(req: Request, res: Response) {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { milestoneId: true, projectId: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const data: Record<string, unknown> = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
    if (data.startDate) data.startDate = new Date(data.startDate as string);
    if (data.milestoneId === "") data.milestoneId = null;

    if (data.milestoneId !== undefined) {
      if (
        !(await assertMilestoneBelongsToProject(
          data.milestoneId as string | null,
          existing.projectId,
          res,
        ))
      ) {
        return;
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: data as Parameters<typeof prisma.task.update>[0]["data"],
    });

    const prevMilestone = existing.milestoneId ?? null;
    const nextMilestone = task.milestoneId ?? null;
    for (const mid of milestoneIdsToResync(prevMilestone, nextMilestone)) {
      await syncMilestoneWorkflowForMilestoneId(mid);
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task" });
  }
}

export async function deleteTaskHandler(req: Request, res: Response) {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      select: { milestoneId: true },
    });

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    if (existing?.milestoneId) {
      await syncMilestoneWorkflowForMilestoneId(existing.milestoneId);
    }

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
}
