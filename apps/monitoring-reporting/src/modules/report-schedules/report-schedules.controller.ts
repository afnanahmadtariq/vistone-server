import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createReportScheduleHandler(req: Request, res: Response) {
    try {
        const reportSchedule = await prisma.reportSchedule.create({
            data: req.body,
        });
        res.json(reportSchedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create report schedule' });
    }
}

export async function getAllReportSchedulesHandler(req: Request, res: Response) {
    try {
        const { organizationId, isActive } = req.query;
        const where: Record<string, unknown> = {};
        if (organizationId) where.organizationId = organizationId as string;
        if (isActive !== undefined) where.isActive = isActive === 'true';
        const reportSchedules = await prisma.reportSchedule.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json(reportSchedules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch report schedules' });
    }
}

export async function getReportScheduleByIdHandler(req: Request, res: Response) {
    try {
        const reportSchedule = await prisma.reportSchedule.findUnique({
            where: { id: req.params.id },
        });
        if (!reportSchedule) {
            res.status(404).json({ error: 'Report schedule not found' });
            return;
        }
        res.json(reportSchedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch report schedule' });
    }
}

export async function updateReportScheduleHandler(req: Request, res: Response) {
    try {
        const reportSchedule = await prisma.reportSchedule.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json(reportSchedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update report schedule' });
    }
}

export async function deleteReportScheduleHandler(req: Request, res: Response) {
    try {
        await prisma.reportSchedule.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: 'Report schedule deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete report schedule' });
    }
}
