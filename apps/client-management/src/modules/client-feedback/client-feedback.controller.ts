import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createClientFeedbackHandler(req: Request, res: Response) {
    try {
    const clientFeedback = await prisma.clientFeedback.create({
      data: req.body,
    });
    res.json(clientFeedback);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create client feedback' });
    }
}

export async function getAllClientFeedbacksHandler(req: Request, res: Response) {
    try {
    const { projectId, clientId } = req.query;
    const where: { projectId?: string; clientId?: string } = {};
    if (typeof projectId === "string" && projectId) {
      where.projectId = projectId;
    }
    if (typeof clientId === "string" && clientId) {
      where.clientId = clientId;
    }
    const clientFeedbacks = await prisma.clientFeedback.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(clientFeedbacks);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client feedbacks' });
    }
}

export async function getClientFeedbackByIdHandler(req: Request, res: Response) {
    try {
    const clientFeedback = await prisma.clientFeedback.findUnique({
      where: { id: req.params.id },
    });
    if (!clientFeedback) {
      res.status(404).json({ error: 'Client feedback not found' });
      return;
    }
    res.json(clientFeedback);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client feedback' });
    }
}

export async function updateClientFeedbackHandler(req: Request, res: Response) {
    try {
    const clientFeedback = await prisma.clientFeedback.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(clientFeedback);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update client feedback' });
    }
}

export async function deleteClientFeedbackHandler(req: Request, res: Response) {
    try {
    await prisma.clientFeedback.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Client feedback deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete client feedback' });
    }
}
