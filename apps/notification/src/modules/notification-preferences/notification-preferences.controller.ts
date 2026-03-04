import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createNotificationPreferenceHandler(req: Request, res: Response) {
    try {
    const notificationPreference = await prisma.notificationPreference.create({
      data: req.body,
    });
    res.json(notificationPreference);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification preference' });
    }
}

export async function getAllNotificationPreferencesHandler(req: Request, res: Response) {
    try {
    const notificationPreferences = await prisma.notificationPreference.findMany();
    res.json(notificationPreferences);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
}

export async function getNotificationPreferenceByIdHandler(req: Request, res: Response) {
    try {
    const notificationPreference = await prisma.notificationPreference.findUnique({
      where: { id: req.params.id },
    });
    if (!notificationPreference) {
      res.status(404).json({ error: 'Notification preference not found' });
      return;
    }
    res.json(notificationPreference);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification preference' });
    }
}

export async function updateNotificationPreferenceHandler(req: Request, res: Response) {
    try {
    const notificationPreference = await prisma.notificationPreference.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(notificationPreference);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update notification preference' });
    }
}

export async function deleteNotificationPreferenceHandler(req: Request, res: Response) {
    try {
    await prisma.notificationPreference.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Notification preference deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification preference' });
    }
}
