import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createNotificationTemplateHandler(req: Request, res: Response) {
    try {
    const notificationTemplate = await prisma.notificationTemplate.create({
      data: req.body,
    });
    res.json(notificationTemplate);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification template' });
    }
}

export async function getAllNotificationTemplatesHandler(req: Request, res: Response) {
    try {
    const notificationTemplates = await prisma.notificationTemplate.findMany();
    res.json(notificationTemplates);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification templates' });
    }
}

export async function getNotificationTemplateByIdHandler(req: Request, res: Response) {
    try {
    const notificationTemplate = await prisma.notificationTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!notificationTemplate) {
      res.status(404).json({ error: 'Notification template not found' });
      return;
    }
    res.json(notificationTemplate);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification template' });
    }
}

export async function updateNotificationTemplateHandler(req: Request, res: Response) {
    try {
    const notificationTemplate = await prisma.notificationTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(notificationTemplate);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update notification template' });
    }
}

export async function deleteNotificationTemplateHandler(req: Request, res: Response) {
    try {
    await prisma.notificationTemplate.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Notification template deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification template' });
    }
}
