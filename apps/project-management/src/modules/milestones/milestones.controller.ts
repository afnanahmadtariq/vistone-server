import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createMilestoneHandler(req: Request, res: Response) {
    try {
    const { name, title, description, dueDate, status, projectId, completed, completedAt } = req.body;

    // Map 'name' to 'title' if 'title' is not provided (backwards compatibility)
    const milestoneTitle = title || name;

    if (!milestoneTitle) {
      res.status(400).json({ error: 'Title or name is required for milestone' });
      return;
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: milestoneTitle,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status || 'pending',
        completed: completed || false,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      },
    });
    res.json(milestone);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create milestone' });
    }
}

export async function getAllMilestonesHandler(req: Request, res: Response) {
    try {
    const { projectId } = req.query;
    const where: any = {};
    if (projectId) {
      where.projectId = projectId as string;
    }
    const milestones = await prisma.milestone.findMany({ where });
    res.json(milestones);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
    }
}

export async function getMilestoneByIdHandler(req: Request, res: Response) {
    try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
    });
    if (!milestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }
    res.json(milestone);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestone' });
    }
}

export async function updateMilestoneHandler(req: Request, res: Response) {
    try {
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(milestone);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update milestone' });
    }
}

export async function deleteMilestoneHandler(req: Request, res: Response) {
    try {
    await prisma.milestone.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Milestone deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete milestone' });
    }
}
