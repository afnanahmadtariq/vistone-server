import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createAiInsightHandler(req: Request, res: Response) {
  try {
    const aiInsight = await prisma.aiInsight.create({
      data: req.body,
    });
    res.json(aiInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create AI insight' });
  }
}

export async function getAllAiInsightsHandler(req: Request, res: Response) {
  try {
    const { projectId, taskId } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId as string;
    if (taskId) where.taskId = taskId as string;
    const aiInsights = await prisma.aiInsight.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(aiInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
}

export async function getAiInsightByIdHandler(req: Request, res: Response) {
  try {
    const aiInsight = await prisma.aiInsight.findUnique({
      where: { id: req.params.id },
    });
    if (!aiInsight) {
      res.status(404).json({ error: 'AI insight not found' });
      return;
    }
    res.json(aiInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI insight' });
  }
}

export async function updateAiInsightHandler(req: Request, res: Response) {
  try {
    const aiInsight = await prisma.aiInsight.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(aiInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update AI insight' });
  }
}

export async function deleteAiInsightHandler(req: Request, res: Response) {
  try {
    await prisma.aiInsight.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'AI insight deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete AI insight' });
  }
}
