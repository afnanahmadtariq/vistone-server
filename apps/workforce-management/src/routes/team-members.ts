import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Team Member
router.post('/', async (req, res) => {
  try {
    const teamMember = await prisma.teamMember.create({
      data: req.body,
    });
    res.json(teamMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// Get all Team Members
router.get('/', async (req, res) => {
  try {
    const teamMembers = await prisma.teamMember.findMany();
    res.json(teamMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get Team Member by ID
router.get('/:id', async (req, res) => {
  try {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
    });
    if (!teamMember) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    res.json(teamMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
});

// Update Team Member
router.put('/:id', async (req, res) => {
  try {
    const teamMember = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(teamMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Delete Team Member
router.delete('/:id', async (req, res) => {
  try {
    await prisma.teamMember.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Team member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

export default router;
