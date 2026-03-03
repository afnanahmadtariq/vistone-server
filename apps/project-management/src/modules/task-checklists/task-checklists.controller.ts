import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createTaskChecklistHandler(req: Request, res: Response) {
    try {
    const taskChecklist = await prisma.taskChecklist.create({
      data: req.body,
    });
    res.json(taskChecklist);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task checklist' });
    }
}

export async function getAllTaskChecklistsHandler(req: Request, res: Response) {
    try {
    const taskChecklists = await prisma.taskChecklist.findMany();
    res.json(taskChecklists);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task checklists' });
    }
}

export async function getTaskChecklistByIdHandler(req: Request, res: Response) {
    try {
    const taskChecklist = await prisma.taskChecklist.findUnique({
      where: { id: req.params.id },
    });
    if (!taskChecklist) {
      res.status(404).json({ error: 'Task checklist not found' });
      return;
    }
    res.json(taskChecklist);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task checklist' });
    }
}

export async function updateTaskChecklistHandler(req: Request, res: Response) {
    try {
    const taskChecklist = await prisma.taskChecklist.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(taskChecklist);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task checklist' });
    }
}

export async function deleteTaskChecklistHandler(req: Request, res: Response) {
    try {
    await prisma.taskChecklist.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Task checklist deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task checklist' });
    }
}
