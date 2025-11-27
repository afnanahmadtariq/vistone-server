import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create TaskChecklist
router.post('/', async (req, res) => {
  try {
    const taskChecklist = await prisma.taskChecklist.create({
      data: req.body,
    });
    res.json(taskChecklist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task checklist' });
  }
});

// Get all TaskChecklists
router.get('/', async (req, res) => {
  try {
    const taskChecklists = await prisma.taskChecklist.findMany();
    res.json(taskChecklists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task checklists' });
  }
});

// Get TaskChecklist by ID
router.get('/:id', async (req, res) => {
  try {
    const taskChecklist = await prisma.taskChecklist.findUnique({
      where: { id: req.params.id },
    });
    if (!taskChecklist) {
      res.status(404).json({ error: 'Task checklist not found' });
      return;
    }
    res.json(taskChecklist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task checklist' });
  }
});

// Update TaskChecklist
router.put('/:id', async (req, res) => {
  try {
    const taskChecklist = await prisma.taskChecklist.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(taskChecklist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task checklist' });
  }
});

// Delete TaskChecklist
router.delete('/:id', async (req, res) => {
  try {
    await prisma.taskChecklist.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Task checklist deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task checklist' });
  }
});

export default router;
