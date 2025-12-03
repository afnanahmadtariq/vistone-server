import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Notification Template
router.post('/', async (req, res) => {
  try {
    const notificationTemplate = await prisma.notificationTemplate.create({
      data: req.body,
    });
    res.json(notificationTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create notification template' });
  }
});

// Get all Notification Templates
router.get('/', async (req, res) => {
  try {
    const notificationTemplates = await prisma.notificationTemplate.findMany();
    res.json(notificationTemplates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notification templates' });
  }
});

// Get Notification Template by ID
router.get('/:id', async (req, res) => {
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
});

// Update Notification Template
router.put('/:id', async (req, res) => {
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
});

// Delete Notification Template
router.delete('/:id', async (req, res) => {
  try {
    await prisma.notificationTemplate.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Notification template deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete notification template' });
  }
});

export default router;
