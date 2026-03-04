import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createDashboardHandler(req: Request, res: Response) {
    try {
    const dashboard = await prisma.dashboard.create({
      data: req.body,
    });
    res.json(dashboard);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dashboard' });
    }
}

export async function getAllDashboardsHandler(req: Request, res: Response) {
    try {
    const dashboards = await prisma.dashboard.findMany();
    res.json(dashboards);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
    }
}

export async function getDashboardByIdHandler(req: Request, res: Response) {
    try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: req.params.id },
    });
    if (!dashboard) {
      res.status(404).json({ error: 'Dashboard not found' });
      return;
    }
    res.json(dashboard);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
}

export async function updateDashboardHandler(req: Request, res: Response) {
    try {
    const dashboard = await prisma.dashboard.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(dashboard);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update dashboard' });
    }
}

export async function deleteDashboardHandler(req: Request, res: Response) {
    try {
    await prisma.dashboard.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Dashboard deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
    }
}
