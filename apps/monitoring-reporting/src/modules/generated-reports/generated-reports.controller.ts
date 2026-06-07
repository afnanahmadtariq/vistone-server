import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createGeneratedReportHandler(req: Request, res: Response) {
  try {
    const { templateId, format, url } = req.body ?? {};

    // Keep create payload aligned with Prisma schema and prevent validation errors.
    const reportUrl =
      typeof url === "string" && url.trim().length > 0
        ? url.trim()
        : `pending://generated-reports/${Date.now()}`;

    const generatedReport = await prisma.generatedReport.create({
      data: {
        templateId: typeof templateId === "string" ? templateId : undefined,
        format: typeof format === "string" && format.trim() ? format.trim() : "pdf",
        url: reportUrl,
      },
    });
    res.json(generatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create generated report" });
  }
}

export async function getAllGeneratedReportsHandler(req: Request, res: Response) {
  try {
    const generatedReports = await prisma.generatedReport.findMany();
    res.json(generatedReports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch generated reports" });
  }
}

export async function getGeneratedReportByIdHandler(req: Request, res: Response) {
  try {
    const generatedReport = await prisma.generatedReport.findUnique({
      where: { id: req.params.id },
    });
    if (!generatedReport) {
      res.status(404).json({ error: "Generated report not found" });
      return;
    }
    res.json(generatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch generated report" });
  }
}
