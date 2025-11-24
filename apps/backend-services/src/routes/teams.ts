import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Team
router.post('/', async (req, res) => {
  try {
    const team = await prisma.team.create({
      data: req.body,
    });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get all Teams
router.get('/', async (req, res) => {
  try {
    const teams = await prisma.team.findMany();
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get Team by ID
router.get('/:id', async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
    });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Update Team
router.put('/:id', async (req, res) => {
  try {
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Delete Team
router.delete('/:id', async (req, res) => {
  try {
    await prisma.team.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Team deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

export default router;
