import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create ClientFeedback
router.post('/', async (req, res) => {
  try {
    const clientFeedback = await prisma.clientFeedback.create({
      data: req.body,
    });
    res.json(clientFeedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create client feedback' });
  }
});

// Get all ClientFeedback
router.get('/', async (req, res) => {
  try {
    const clientFeedback = await prisma.clientFeedback.findMany();
    res.json(clientFeedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client feedback' });
  }
});

// Get ClientFeedback by ID
router.get('/:id', async (req, res) => {
  try {
    const clientFeedback = await prisma.clientFeedback.findUnique({
      where: { id: req.params.id },
    });
    if (!clientFeedback) {
      res.status(404).json({ error: 'Client feedback not found' });
      return;
    }
    res.json(clientFeedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client feedback' });
  }
});

// Update ClientFeedback
router.put('/:id', async (req, res) => {
  try {
    const clientFeedback = await prisma.clientFeedback.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(clientFeedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update client feedback' });
  }
});

// Delete ClientFeedback
router.delete('/:id', async (req, res) => {
  try {
    await prisma.clientFeedback.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Client feedback deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete client feedback' });
  }
});

export default router;
