import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create MemberPerformance
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

// Get all MemberPerformance
router.get('/', async (req, res) => {
  try {
    const memberPerformance = await prisma.memberPerformance.findMany();
    res.json(memberPerformance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch member performance' });
  }
});

// Get MemberPerformance by ID
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

// Update MemberPerformance
router.put('/:id', async (req, res) => {
  try {
    const memberPerformance = await prisma.memberPerformance.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(memberPerformance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update member performance' });
  }
});

// Delete MemberPerformance
router.delete('/:id', async (req, res) => {
  try {
    await prisma.memberPerformance.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Member performance deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete member performance' });
  }
});

export default router;
