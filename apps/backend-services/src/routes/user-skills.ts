import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create UserSkill
router.post('/', async (req, res) => {
  try {
    const userSkill = await prisma.userSkill.create({
      data: req.body,
    });
    res.json(userSkill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user skill' });
  }
});

// Get all UserSkills
router.get('/', async (req, res) => {
  try {
    const userSkills = await prisma.userSkill.findMany();
    res.json(userSkills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user skills' });
  }
});

// Get UserSkill by ID
router.get('/:id', async (req, res) => {
  try {
    const userSkill = await prisma.userSkill.findUnique({
      where: { id: req.params.id },
    });
    if (!userSkill) {
      res.status(404).json({ error: 'User skill not found' });
      return;
    }
    res.json(userSkill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user skill' });
  }
});

// Update UserSkill
router.put('/:id', async (req, res) => {
  try {
    const userSkill = await prisma.userSkill.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(userSkill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user skill' });
  }
});

// Delete UserSkill
router.delete('/:id', async (req, res) => {
  try {
    await prisma.userSkill.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'User skill deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user skill' });
  }
});

export default router;
