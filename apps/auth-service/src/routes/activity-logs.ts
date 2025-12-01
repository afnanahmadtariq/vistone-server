import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Activity Log
router.post('/', async (req, res) => {
  try {
    const activityLog = await prisma.activityLog.create({
      data: req.body,
    });
    res.json(activityLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// Get all Activity Logs
router.get('/', async (req, res) => {
  try {
    const activityLogs = await prisma.activityLog.findMany();
    res.json(activityLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Get Activity Log by ID
router.get('/:id', async (req, res) => {
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
});

export default router;
