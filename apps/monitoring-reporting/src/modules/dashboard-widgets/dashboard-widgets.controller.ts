import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createDashboardWidgetHandler(req: Request, res: Response) {
    try {
    const dashboardWidget = await prisma.dashboardWidget.create({
      data: req.body,
    });
    res.json(dashboardWidget);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dashboard widget' });
    }
}

export async function getAllDashboardWidgetsHandler(req: Request, res: Response) {
    try {
    const dashboardWidgets = await prisma.dashboardWidget.findMany();
    res.json(dashboardWidgets);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard widgets' });
    }
}

export async function getDashboardWidgetByIdHandler(req: Request, res: Response) {
    try {
    const dashboardWidget = await prisma.dashboardWidget.findUnique({
      where: { id: req.params.id },
    });
    if (!dashboardWidget) {
      res.status(404).json({ error: 'Dashboard widget not found' });
      return;
    }
    res.json(dashboardWidget);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard widget' });
    }
}

export async function updateDashboardWidgetHandler(req: Request, res: Response) {
    try {
    const dashboardWidget = await prisma.dashboardWidget.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(dashboardWidget);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update dashboard widget' });
    }
}

export async function deleteDashboardWidgetHandler(req: Request, res: Response) {
    try {
    await prisma.dashboardWidget.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Dashboard widget deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dashboard widget' });
    }
}
