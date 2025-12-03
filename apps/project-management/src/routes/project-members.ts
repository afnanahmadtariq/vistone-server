import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Project Member
router.post('/', async (req, res) => {
  try {
    const projectMember = await prisma.projectMember.create({
      data: req.body,
    });
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project member' });
  }
});

// Get all Project Members
router.get('/', async (req, res) => {
  try {
    const projectMembers = await prisma.projectMember.findMany();
    res.json(projectMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
});

// Get Project Member by ID
router.get('/:id', async (req, res) => {
  try {
    const projectMember = await prisma.projectMember.findUnique({
      where: { id: req.params.id },
    });
    if (!projectMember) {
      res.status(404).json({ error: 'Project member not found' });
      return;
    }
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project member' });
  }
});

// Update Project Member
router.put('/:id', async (req, res) => {
  try {
    const projectMember = await prisma.projectMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(projectMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project member' });
  }
});

// Delete Project Member
router.delete('/:id', async (req, res) => {
  try {
    await prisma.projectMember.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Project member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project member' });
  }
});

export default router;
