import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createTaskHandler(req: Request, res: Response) {
  try {
    const data: Record<string, unknown> = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
    if (data.startDate) data.startDate = new Date(data.startDate as string);

    const task = await prisma.task.create({ data });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
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
        _count: { select: { subtasks: true, checklists: true, dependencies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

export async function getTaskByIdHandler(req: Request, res: Response) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        subtasks: {
          include: { checklists: true },
          orderBy: { createdAt: 'asc' },
        },
        checklists: { orderBy: { createdAt: 'asc' } },
        dependencies: {
          include: { dependsOn: { select: { id: true, title: true, status: true } } },
        },
        dependentOn: {
          include: { task: { select: { id: true, title: true, status: true } } },
        },
        aiInsights: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
}

export async function updateTaskHandler(req: Request, res: Response) {
  try {
    const data: Record<string, unknown> = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
    if (data.startDate) data.startDate = new Date(data.startDate as string);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function deleteTaskHandler(req: Request, res: Response) {
  try {
    await prisma.task.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
}
