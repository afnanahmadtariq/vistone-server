import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createProjectMemberHandler(req: Request, res: Response) {
  try {
    const projectMember = await prisma.projectMember.create({
      data: req.body,
    });
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project member' });
  }
}

export async function getAllProjectMembersHandler(req: Request, res: Response) {
  try {
    const { projectId, userId } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId as string;
    if (userId) where.userId = userId as string;
    const projectMembers = await prisma.projectMember.findMany({ where });
    res.json(projectMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
}

export async function getProjectMemberByIdHandler(req: Request, res: Response) {
  try {
    const projectMember = await prisma.projectMember.findUnique({
      where: { id: req.params.id },
    });
    if (!projectMember) {
      res.status(404).json({ error: 'Project member not found' });
      return;
    }
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project member' });
  }
}

export async function updateProjectMemberHandler(req: Request, res: Response) {
  try {
    const projectMember = await prisma.projectMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project member' });
  }
}

export async function deleteProjectMemberHandler(req: Request, res: Response) {
  try {
    await prisma.projectMember.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Project member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project member' });
  }
}
