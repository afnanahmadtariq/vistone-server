import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create CommunicationLog
router.post('/', async (req, res) => {
  try {
    const communicationLog = await prisma.communicationLog.create({
      data: req.body,
    });
    res.json(communicationLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create communication log' });
  }
});

// Get all CommunicationLogs
router.get('/', async (req, res) => {
  try {
    const communicationLogs = await prisma.communicationLog.findMany();
    res.json(communicationLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch communication logs' });
  }
});

// Get CommunicationLog by ID
router.get('/:id', async (req, res) => {
  try {
    const communicationLog = await prisma.communicationLog.findUnique({
      where: { id: req.params.id },
    });
    if (!communicationLog) {
      res.status(404).json({ error: 'Communication log not found' });
      return;
    }
    res.json(communicationLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch communication log' });
  }
});

// Update CommunicationLog
router.put('/:id', async (req, res) => {
  try {
    const communicationLog = await prisma.communicationLog.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(communicationLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update communication log' });
  }
});

// Delete CommunicationLog
router.delete('/:id', async (req, res) => {
  try {
    await prisma.communicationLog.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Communication log deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete communication log' });
  }
});

export default router;
