import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Dashboard
router.post('/', async (req, res) => {
  try {
    const dashboard = await prisma.dashboard.create({
      data: req.body,
    });
    res.json(dashboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// Get all Dashboards
router.get('/', async (req, res) => {
  try {
    const dashboards = await prisma.dashboard.findMany();
    res.json(dashboards);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

// Get Dashboard by ID
router.get('/:id', async (req, res) => {
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
});

// Update Dashboard
router.put('/:id', async (req, res) => {
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
});

// Delete Dashboard
router.delete('/:id', async (req, res) => {
  try {
    await prisma.dashboard.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Dashboard deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

export default router;
