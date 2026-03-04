import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createTaskDependencyHandler(req: Request, res: Response) {
    try {
    const taskDependency = await prisma.taskDependency.create({
      data: req.body,
    });
    res.json(taskDependency);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task dependency' });
    }
}

export async function getAllTaskDependenciesHandler(req: Request, res: Response) {
    try {
    const taskDependencies = await prisma.taskDependency.findMany();
    res.json(taskDependencies);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task dependencies' });
    }
}

export async function getTaskDependencyByIdHandler(req: Request, res: Response) {
    try {
    const taskDependency = await prisma.taskDependency.findUnique({
      where: { id: req.params.id },
    });
    if (!taskDependency) {
      res.status(404).json({ error: 'Task dependency not found' });
      return;
    }
    res.json(taskDependency);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task dependency' });
    }
}

export async function updateTaskDependencyHandler(req: Request, res: Response) {
    try {
    const taskDependency = await prisma.taskDependency.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(taskDependency);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task dependency' });
    }
}

export async function deleteTaskDependencyHandler(req: Request, res: Response) {
    try {
    await prisma.taskDependency.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Task dependency deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task dependency' });
    }
}
