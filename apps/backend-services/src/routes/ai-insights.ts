import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create AiInsight
router.post('/', async (req, res) => {
  try {
    const aiInsight = await prisma.aiInsight.create({
      data: req.body,
    });
    res.json(aiInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create AI insight' });
  }
});

// Get all AiInsights
router.get('/', async (req, res) => {
  try {
    const aiInsights = await prisma.aiInsight.findMany();
    res.json(aiInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// Get AiInsight by ID
router.get('/:id', async (req, res) => {
  try {
    const aiInsight = await prisma.aiInsight.findUnique({
      where: { id: req.params.id },
    });
    if (!aiInsight) {
      res.status(404).json({ error: 'AI insight not found' });
      return;
    }
    res.json(aiInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI insight' });
  }
});

// Update AiInsight
router.put('/:id', async (req, res) => {
  try {
    const aiInsight = await prisma.aiInsight.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(aiInsight);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update AI insight' });
  }
});

// Delete AiInsight
router.delete('/:id', async (req, res) => {
  try {
    await prisma.aiInsight.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'AI insight deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete AI insight' });
  }
});

export default router;
