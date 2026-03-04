import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createKpiDefinitionHandler(req: Request, res: Response) {
    try {
    const kpiDefinition = await prisma.kpiDefinition.create({
      data: req.body,
    });
    res.json(kpiDefinition);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create KPI definition' });
    }
}

export async function getAllKpiDefinitionsHandler(req: Request, res: Response) {
    try {
    const kpiDefinitions = await prisma.kpiDefinition.findMany();
    res.json(kpiDefinitions);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI definitions' });
    }
}

export async function getKpiDefinitionByIdHandler(req: Request, res: Response) {
    try {
    const kpiDefinition = await prisma.kpiDefinition.findUnique({
      where: { id: req.params.id },
    });
    if (!kpiDefinition) {
      res.status(404).json({ error: 'KPI definition not found' });
      return;
    }
    res.json(kpiDefinition);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI definition' });
    }
}

export async function updateKpiDefinitionHandler(req: Request, res: Response) {
    try {
    const kpiDefinition = await prisma.kpiDefinition.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(kpiDefinition);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update KPI definition' });
    }
}

export async function deleteKpiDefinitionHandler(req: Request, res: Response) {
    try {
    await prisma.kpiDefinition.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'KPI definition deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete KPI definition' });
    }
}
