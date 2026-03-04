import { Request, Response } from "express";
import prisma from "../../lib/prisma";

/**
 * Log an activity event. Used internally by auth handlers and externally via API.
 */
export async function logActivity(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: unknown;
  ipAddress?: string;
}) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: data.details ?? undefined,
        ipAddress: data.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
}

export async function createActivityLogHandler(req: Request, res: Response) {
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
    const { userId, action } = req.query;
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId as string;
    if (action) where.action = action as string;
    const activityLogs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
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
