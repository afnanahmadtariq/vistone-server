import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create User Availability
router.post('/', async (req, res) => {
  try {
    const userAvailability = await prisma.userAvailability.create({
      data: req.body,
    });
    res.json(userAvailability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user availability' });
  }
});

// Get all User Availability
router.get('/', async (req, res) => {
  try {
    const userAvailability = await prisma.userAvailability.findMany();
    res.json(userAvailability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user availability' });
  }
});

// Get User Availability by ID
router.get('/:id', async (req, res) => {
  try {
    const userAvailability = await prisma.userAvailability.findUnique({
      where: { id: req.params.id },
    });
    if (!userAvailability) {
      res.status(404).json({ error: 'User availability not found' });
      return;
    }
    res.json(userAvailability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user availability' });
  }
});

// Update User Availability
router.put('/:id', async (req, res) => {
  try {
    const userAvailability = await prisma.userAvailability.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(userAvailability);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user availability' });
  }
});

// Delete User Availability
router.delete('/:id', async (req, res) => {
  try {
    await prisma.userAvailability.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'User availability deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user availability' });
  }
});

export default router;
