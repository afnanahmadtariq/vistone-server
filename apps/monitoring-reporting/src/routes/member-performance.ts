import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Member Performance
router.post('/', async (req, res) => {
  try {
    const memberPerformance = await prisma.memberPerformance.create({
      data: req.body,
    });
    res.json(memberPerformance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create member performance' });
  }
});

// Get all Member Performances
router.get('/', async (req, res) => {
  try {
    const memberPerformances = await prisma.memberPerformance.findMany();
    res.json(memberPerformances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch member performances' });
  }
});

// Get Member Performance by ID
router.get('/:id', async (req, res) => {
  try {
    const memberPerformance = await prisma.memberPerformance.findUnique({
      where: { id: req.params.id },
    });
    if (!memberPerformance) {
      res.status(404).json({ error: 'Member performance not found' });
      return;
    }
    res.json(memberPerformance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch member performance' });
  }
});

export default router;
