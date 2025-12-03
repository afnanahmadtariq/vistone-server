import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Client
router.post('/', async (req, res) => {
  try {
    const client = await prisma.client.create({
      data: req.body,
    });
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Get all Clients
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany();
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get Client by ID
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
    });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Update Client
router.put('/:id', async (req, res) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete Client
router.delete('/:id', async (req, res) => {
  try {
    await prisma.client.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Client deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
