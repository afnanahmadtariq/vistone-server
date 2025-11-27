import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create AutomationLog
router.post('/', async (req, res) => {
  try {
    const automationLog = await prisma.automationLog.create({
      data: req.body,
    });
    res.json(automationLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create automation log' });
  }
});

// Get all AutomationLogs
router.get('/', async (req, res) => {
  try {
    const automationLogs = await prisma.automationLog.findMany();
    res.json(automationLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch automation logs' });
  }
});

// Get AutomationLog by ID
router.get('/:id', async (req, res) => {
  try {
    const automationLog = await prisma.automationLog.findUnique({
      where: { id: req.params.id },
    });
    if (!automationLog) {
      res.status(404).json({ error: 'Automation log not found' });
      return;
    }
    res.json(automationLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch automation log' });
  }
});

// Update AutomationLog
router.put('/:id', async (req, res) => {
  try {
    const automationLog = await prisma.automationLog.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(automationLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update automation log' });
  }
});

// Delete AutomationLog
router.delete('/:id', async (req, res) => {
  try {
    await prisma.automationLog.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Automation log deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete automation log' });
  }
});

export default router;
