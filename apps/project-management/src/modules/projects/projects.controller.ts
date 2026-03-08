import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createProjectHandler(req: Request, res: Response) {
  try {
    const {
      organizationId,
      name,
      description,
      status,
      startDate,
      endDate,
      budget,
      spentBudget,
      progress,
      clientId,
      managerId,
      teamIds,
      metadata,
    } = req.body;

    const project = await prisma.project.create({
      data: {
        organizationId,
        name,
        description,
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget,
        spentBudget,
        progress: progress ?? 0,
        clientId,
        managerId,
        teamIds: teamIds ?? [],
        metadata,
      },
    });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
}

export async function getAllProjectsHandler(req: Request, res: Response) {
  try {
    const { status, search, organizationId, managerId, clientId } = req.query;
    const where: Record<string, unknown> = {};

    if (organizationId) {
      where.organizationId = organizationId as string;
    }

    if (managerId) {
      where.managerId = managerId as string;
    }

    if (clientId) {
      where.clientId = clientId as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        members: true,
        _count: {
          select: { tasks: true, milestones: true, risks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

export async function getProjectByIdHandler(req: Request, res: Response) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
        tasks: {
          where: { parentId: null },
          include: {
            subtasks: true,
            checklists: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        milestones: { orderBy: { dueDate: 'asc' } },
        risks: { orderBy: { createdAt: 'desc' } },
        aiInsights: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
}

export async function updateProjectHandler(req: Request, res: Response) {
  try {
    const data: Record<string, unknown> = { ...req.body };
    // Convert date strings to Date objects
    if (data.startDate) data.startDate = new Date(data.startDate as string);
    if (data.endDate) data.endDate = new Date(data.endDate as string);

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
    });
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
}

export async function deleteProjectHandler(req: Request, res: Response) {
  try {
    await prisma.project.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
}
