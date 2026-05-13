import { Request, Response } from "express";
import prisma from "../../lib/prisma";

const LINK_TYPES = new Set(["FS", "SS", "FF", "SF"]);

function normalizeLinkType(raw: unknown): string {
  const t = String(raw ?? "FS")
    .trim()
    .toUpperCase();
  if (LINK_TYPES.has(t)) return t;
  const lower = String(raw ?? "").toLowerCase();
  if (lower.includes("finish") && lower.includes("start") && !lower.includes("finish-to-finish"))
    return "FS";
  if (lower.includes("start-to-start") || lower === "ss") return "SS";
  if (lower.includes("finish-to-finish") || lower === "ff") return "FF";
  if (lower.includes("start-to-finish") || lower === "sf") return "SF";
  return "FS";
}

export async function createTaskDependencyHandler(req: Request, res: Response) {
  try {
    const { taskId, dependsOnId, type } = req.body as {
      taskId: string;
      dependsOnId: string;
      type?: string;
    };
    if (!taskId || !dependsOnId) {
      res.status(400).json({ error: "taskId and dependsOnId are required" });
      return;
    }
    if (taskId === dependsOnId) {
      res.status(400).json({ error: "A task cannot depend on itself" });
      return;
    }
    const normalized = normalizeLinkType(type);
    const taskDependency = await prisma.taskDependency.create({
      data: { taskId, dependsOnId, type: normalized },
    });
    res.json(taskDependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task dependency" });
  }
}

export async function getAllTaskDependenciesHandler(req: Request, res: Response) {
  try {
    const { taskId, projectId } = req.query;
    const where: Record<string, unknown> = {};

    if (typeof taskId === "string" && taskId.length > 0) {
      where.OR = [{ taskId }, { dependsOnId: taskId }];
    } else if (typeof projectId === "string" && projectId.length > 0) {
      const projectTasks = await prisma.task.findMany({
        where: { projectId },
        select: { id: true },
      });
      const ids = projectTasks.map((t: { id: string }) => t.id);
      if (ids.length === 0) {
        res.json([]);
        return;
      }
      where.OR = [{ taskId: { in: ids } }, { dependsOnId: { in: ids } }];
    }

    const taskDependencies = await prisma.taskDependency.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(taskDependencies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task dependencies" });
  }
}

export async function getTaskDependencyByIdHandler(req: Request, res: Response) {
  try {
    const taskDependency = await prisma.taskDependency.findUnique({
      where: { id: req.params.id },
    });
    if (!taskDependency) {
      res.status(404).json({ error: "Task dependency not found" });
      return;
    }
    res.json(taskDependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch task dependency" });
  }
}

export async function updateTaskDependencyHandler(req: Request, res: Response) {
  try {
    const data = { ...req.body } as Record<string, unknown>;
    if (data.type !== undefined) {
      data.type = normalizeLinkType(data.type);
    }
    const taskDependency = await prisma.taskDependency.update({
      where: { id: req.params.id },
      data,
    });
    res.json(taskDependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task dependency" });
  }
}

export async function deleteTaskDependencyHandler(req: Request, res: Response) {
  try {
    await prisma.taskDependency.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "Task dependency deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task dependency" });
  }
}
