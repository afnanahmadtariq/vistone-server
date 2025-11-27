import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Milestone
router.post('/', async (req, res) => {
  try {
    const milestone = await prisma.milestone.create({
      data: req.body,
    });
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// Get all Milestones
router.get('/', async (req, res) => {
  try {
    const milestones = await prisma.milestone.findMany();
    res.json(milestones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Get Milestone by ID
router.get('/:id', async (req, res) => {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
    });
    if (!milestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestone' });
  }
});

// Update Milestone
router.put('/:id', async (req, res) => {
  try {
    const milestone = await prisma.milestone.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// Delete Milestone
router.delete('/:id', async (req, res) => {
  try {
    await prisma.milestone.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Milestone deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

export default router;
