import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create TaskDependency
router.post('/', async (req, res) => {
  try {
    const taskDependency = await prisma.taskDependency.create({
      data: req.body,
    });
    res.json(taskDependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task dependency' });
  }
});

// Get all TaskDependencies
router.get('/', async (req, res) => {
  try {
    const taskDependencies = await prisma.taskDependency.findMany();
    res.json(taskDependencies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task dependencies' });
  }
});

// Get TaskDependency by ID
router.get('/:id', async (req, res) => {
  try {
    const taskDependency = await prisma.taskDependency.findUnique({
      where: { id: req.params.id },
    });
    if (!taskDependency) {
      res.status(404).json({ error: 'Task dependency not found' });
      return;
    }
    res.json(taskDependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task dependency' });
  }
});

// Update TaskDependency
router.put('/:id', async (req, res) => {
  try {
    const taskDependency = await prisma.taskDependency.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(taskDependency);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task dependency' });
  }
});

// Delete TaskDependency
router.delete('/:id', async (req, res) => {
  try {
    await prisma.taskDependency.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Task dependency deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task dependency' });
  }
});

export default router;
