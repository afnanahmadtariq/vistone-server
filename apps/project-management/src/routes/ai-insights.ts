import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create AI Insight
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

// Get all AI Insights
router.get('/', async (req, res) => {
  try {
    const aiInsights = await prisma.aiInsight.findMany();
    res.json(aiInsights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// Get AI Insight by ID
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

export default router;
