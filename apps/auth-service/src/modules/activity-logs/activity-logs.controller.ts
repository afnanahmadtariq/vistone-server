import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function updateActivityLogIsnTTypicallySupportedButAddingJustInCaseCreateActivityLogHandler(req: Request, res: Response) {
    try {
    const activityLog = await prisma.activityLog.create({
      data: req.body,
    });
    res.json(activityLog);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create activity log' });
    }
}

export async function getAllActivityLogsHandler(req: Request, res: Response) {
    try {
    const activityLogs = await prisma.activityLog.findMany();
    res.json(activityLogs);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
}

export async function getActivityLogByIdHandler(req: Request, res: Response) {
    try {
    const activityLog = await prisma.activityLog.findUnique({
      where: { id: req.params.id },
    });
    if (!activityLog) {
      res.status(404).json({ error: 'Activity log not found' });
      return;
    }
    res.json(activityLog);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
    }
}
