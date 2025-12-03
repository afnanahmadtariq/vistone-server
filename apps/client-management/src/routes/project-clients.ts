import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Project Client
router.post('/', async (req, res) => {
  try {
    const projectClient = await prisma.projectClient.create({
      data: req.body,
    });
    res.json(projectClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project client' });
  }
});

// Get all Project Clients
router.get('/', async (req, res) => {
  try {
    const projectClients = await prisma.projectClient.findMany();
    res.json(projectClients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project clients' });
  }
});

// Get Project Client by ID
router.get('/:id', async (req, res) => {
  try {
    const projectClient = await prisma.projectClient.findUnique({
      where: { id: req.params.id },
    });
    if (!projectClient) {
      res.status(404).json({ error: 'Project client not found' });
      return;
    }
    res.json(projectClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project client' });
  }
});

// Update Project Client
router.put('/:id', async (req, res) => {
  try {
    const projectClient = await prisma.projectClient.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(projectClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project client' });
  }
});

// Delete Project Client
router.delete('/:id', async (req, res) => {
  try {
    await prisma.projectClient.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Project client deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project client' });
  }
});

export default router;
