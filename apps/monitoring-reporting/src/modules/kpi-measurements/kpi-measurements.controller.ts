import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createKpiMeasurementHandler(req: Request, res: Response) {
    try {
    const kpiMeasurement = await prisma.kpiMeasurement.create({
      data: req.body,
    });
    res.json(kpiMeasurement);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create KPI measurement' });
    }
}

export async function getAllKpiMeasurementsHandler(req: Request, res: Response) {
    try {
    const kpiMeasurements = await prisma.kpiMeasurement.findMany();
    res.json(kpiMeasurements);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI measurements' });
    }
}

export async function getKpiMeasurementByIdHandler(req: Request, res: Response) {
    try {
    const kpiMeasurement = await prisma.kpiMeasurement.findUnique({
      where: { id: req.params.id },
    });
    if (!kpiMeasurement) {
      res.status(404).json({ error: 'KPI measurement not found' });
      return;
    }
    res.json(kpiMeasurement);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI measurement' });
    }
}
