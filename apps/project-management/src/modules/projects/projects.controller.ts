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
    const { status, search, organizationId } = req.query;
    const where: any = {};

    // Filter by organizationId if provided
    if (organizationId) {
      where.organizationId = organizationId as string;
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

    const projects = await prisma.project.findMany({ where });
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
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
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
