import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createReportTemplateHandler(req: Request, res: Response) {
    try {
    const reportTemplate = await prisma.reportTemplate.create({
      data: req.body,
    });
    res.json(reportTemplate);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create report template' });
    }
}

export async function getAllReportTemplatesHandler(req: Request, res: Response) {
    try {
    const reportTemplates = await prisma.reportTemplate.findMany();
    res.json(reportTemplates);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report templates' });
    }
}

export async function getReportTemplateByIdHandler(req: Request, res: Response) {
    try {
    const reportTemplate = await prisma.reportTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!reportTemplate) {
      res.status(404).json({ error: 'Report template not found' });
      return;
    }
    res.json(reportTemplate);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report template' });
    }
}

export async function updateReportTemplateHandler(req: Request, res: Response) {
    try {
    const reportTemplate = await prisma.reportTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(reportTemplate);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update report template' });
    }
}

export async function deleteReportTemplateHandler(req: Request, res: Response) {
    try {
    await prisma.reportTemplate.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Report template deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete report template' });
    }
}
