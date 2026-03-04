import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function updateAiInsightIsnTPhysicallyInAiInsightsTsBasedOnEarlierSnippetButIfWeNeedASchemaWeCanAddItCreateAiInsightHandler(req: Request, res: Response) {
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
    const aiInsights = await prisma.aiInsight.findMany();
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
