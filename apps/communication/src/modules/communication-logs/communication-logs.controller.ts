import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createCommunicationLogHandler(req: Request, res: Response) {
    try {
    const communicationLog = await prisma.communicationLog.create({
      data: req.body,
    });
    res.json(communicationLog);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create communication log' });
    }
}

export async function getAllCommunicationLogsHandler(req: Request, res: Response) {
    try {
    const communicationLogs = await prisma.communicationLog.findMany();
    res.json(communicationLogs);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch communication logs' });
    }
}

export async function getCommunicationLogByIdHandler(req: Request, res: Response) {
    try {
    const communicationLog = await prisma.communicationLog.findUnique({
      where: { id: req.params.id },
    });
    if (!communicationLog) {
      res.status(404).json({ error: 'Communication log not found' });
      return;
    }
    res.json(communicationLog);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch communication log' });
    }
}
