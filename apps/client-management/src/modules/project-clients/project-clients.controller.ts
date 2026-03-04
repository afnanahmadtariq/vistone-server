import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createProjectClientHandler(req: Request, res: Response) {
    try {
    const projectClient = await prisma.projectClient.create({
      data: req.body,
    });
    res.json(projectClient);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project client' });
    }
}

export async function getAllProjectClientsHandler(req: Request, res: Response) {
    try {
    const projectClients = await prisma.projectClient.findMany();
    res.json(projectClients);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project clients' });
    }
}

export async function getProjectClientByIdHandler(req: Request, res: Response) {
    try {
    const projectClient = await prisma.projectClient.findUnique({
      where: { id: req.params.id },
    });
    if (!projectClient) {
      res.status(404).json({ error: 'Project client not found' });
      return;
    }
    res.json(projectClient);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project client' });
    }
}

export async function updateProjectClientHandler(req: Request, res: Response) {
    try {
    const projectClient = await prisma.projectClient.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(projectClient);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project client' });
    }
}

export async function deleteProjectClientHandler(req: Request, res: Response) {
    try {
    await prisma.projectClient.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Project client deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project client' });
    }
}
