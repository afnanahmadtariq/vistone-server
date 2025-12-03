import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Dashboard Widget
router.post('/', async (req, res) => {
  try {
    const dashboardWidget = await prisma.dashboardWidget.create({
      data: req.body,
    });
    res.json(dashboardWidget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create dashboard widget' });
  }
});

// Get all Dashboard Widgets
router.get('/', async (req, res) => {
  try {
    const dashboardWidgets = await prisma.dashboardWidget.findMany();
    res.json(dashboardWidgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard widgets' });
  }
});

// Get Dashboard Widget by ID
router.get('/:id', async (req, res) => {
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
});

// Update Dashboard Widget
router.put('/:id', async (req, res) => {
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
});

// Delete Dashboard Widget
router.delete('/:id', async (req, res) => {
  try {
    await prisma.dashboardWidget.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Dashboard widget deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete dashboard widget' });
  }
});

export default router;
