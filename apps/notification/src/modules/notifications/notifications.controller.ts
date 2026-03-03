import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createNotificationHandler(req: Request, res: Response) {
    try {
    const notification = await prisma.notification.create({
      data: req.body,
    });
    res.json(notification);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification' });
    }
}

export async function getAllNotificationsHandler(req: Request, res: Response) {
    try {
    const notifications = await prisma.notification.findMany();
    res.json(notifications);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
    }
}

export async function getNotificationByIdHandler(req: Request, res: Response) {
    try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json(notification);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification' });
    }
}

export async function updateNotificationMarkAsReadEtcHandler(req: Request, res: Response) {
    try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(notification);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update notification' });
    }
}

export async function deleteNotificationHandler(req: Request, res: Response) {
    try {
    await prisma.notification.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification' });
    }
}

export async function getNotificationsByUserHandler(req: Request, res: Response) {
    try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user notifications' });
    }
}

export async function markAllNotificationsAsReadForUserHandler(req: Request, res: Response) {
    try {
    await prisma.notification.updateMany({
      where: {
        userId: req.params.userId,
        isRead: false,
      },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
}
