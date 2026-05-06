import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createProjectMemberHandler(req: Request, res: Response) {
  try {
    const { projectId, userId, role } = req.body ?? {};
    if (typeof projectId !== "string" || !projectId.trim()) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }
    if (typeof userId !== "string" || !userId.trim()) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const existing = await prisma.projectMember.findFirst({
      where: { projectId: projectId.trim(), userId: userId.trim() },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: "Member already assigned to this project" });
      return;
    }

    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: projectId.trim(),
        userId: userId.trim(),
        role: typeof role === "string" ? role.trim() || null : null,
      },
    });
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create project member" });
  }
}

export async function getAllProjectMembersHandler(req: Request, res: Response) {
  try {
    const { projectId, userId, role } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId as string;
    if (userId) where.userId = userId as string;
    if (role) where.role = role as string;
    const projectMembers = await prisma.projectMember.findMany({ where });
    res.json(projectMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch project members" });
  }
}

export async function getProjectMemberByIdHandler(req: Request, res: Response) {
  try {
    const projectMember = await prisma.projectMember.findUnique({
      where: { id: req.params.id },
    });
    if (!projectMember) {
      res.status(404).json({ error: "Project member not found" });
      return;
    }
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch project member" });
  }
}

export async function updateProjectMemberHandler(req: Request, res: Response) {
  try {
    const { userId, projectId, role } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof userId === "string" && userId.trim()) data.userId = userId.trim();
    if (typeof projectId === "string" && projectId.trim()) data.projectId = projectId.trim();
    if (role !== undefined) {
      data.role = typeof role === "string" ? role.trim() || null : null;
    }

    const projectMember = await prisma.projectMember.update({
      where: { id: req.params.id },
      data,
    });
    res.json(projectMember);
  } catch (error: any) {
    console.error(error);
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Project member not found" });
      return;
    }
    res.status(500).json({ error: "Failed to update project member" });
  }
}

export async function deleteProjectMemberHandler(req: Request, res: Response) {
  try {
    await prisma.projectMember.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "Project member deleted" });
  } catch (error: any) {
    console.error(error);
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Project member not found" });
      return;
    }
    res.status(500).json({ error: "Failed to delete project member" });
  }
}
