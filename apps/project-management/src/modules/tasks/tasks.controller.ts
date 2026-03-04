import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createTaskHandler(req: Request, res: Response) {
    try {
    const task = await prisma.task.create({
      data: req.body,
    });
    res.json(task);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
    }
}

export async function getAllTasksHandler(req: Request, res: Response) {
    try {
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) {
      where.projectId = projectId as string;
    }
    const tasks = await prisma.task.findMany({ where });
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
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
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
