import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Notification
router.post('/', async (req, res) => {
  try {
    const notification = await prisma.notification.create({
      data: req.body,
    });
    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get all Notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany();
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get Notification by ID
router.get('/:id', async (req, res) => {
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
});

// Update Notification
router.put('/:id', async (req, res) => {
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
});

// Delete Notification
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
