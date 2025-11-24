import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Role
router.post('/', async (req, res) => {
  try {
    const role = await prisma.role.create({
      data: req.body,
    });
    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Get all Roles
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.role.findMany();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get Role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
    });
    if (!role) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Update Role
router.put('/:id', async (req, res) => {
  try {
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete Role
router.delete('/:id', async (req, res) => {
  try {
    await prisma.role.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Role deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
