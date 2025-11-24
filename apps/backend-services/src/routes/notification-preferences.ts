import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create NotificationPreference
router.post('/', async (req, res) => {
  try {
    const notificationPreference = await prisma.notificationPreference.create({
      data: req.body,
    });
    res.json(notificationPreference);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification preference' });
  }
});

// Get all NotificationPreferences
router.get('/', async (req, res) => {
  try {
    const notificationPreferences = await prisma.notificationPreference.findMany();
    res.json(notificationPreferences);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Get NotificationPreference by ID
router.get('/:id', async (req, res) => {
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
});

// Update NotificationPreference
router.put('/:id', async (req, res) => {
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
});

// Delete NotificationPreference
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notificationPreference.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Notification preference deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification preference' });
  }
});

export default router;
