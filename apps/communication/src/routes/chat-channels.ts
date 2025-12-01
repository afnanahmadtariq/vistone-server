import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Chat Channel
router.post('/', async (req, res) => {
  try {
    const chatChannel = await prisma.chatChannel.create({
      data: req.body,
    });
    res.json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat channel' });
  }
});

// Get all Chat Channels
router.get('/', async (req, res) => {
  try {
    const chatChannels = await prisma.chatChannel.findMany();
    res.json(chatChannels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat channels' });
  }
});

// Get Chat Channel by ID
router.get('/:id', async (req, res) => {
  try {
    const chatChannel = await prisma.chatChannel.findUnique({
      where: { id: req.params.id },
    });
    if (!chatChannel) {
      res.status(404).json({ error: 'Chat channel not found' });
      return;
    }
    res.json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat channel' });
  }
});

// Update Chat Channel
router.put('/:id', async (req, res) => {
  try {
    const chatChannel = await prisma.chatChannel.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update chat channel' });
  }
});

// Delete Chat Channel
router.delete('/:id', async (req, res) => {
  try {
    await prisma.chatChannel.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Chat channel deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete chat channel' });
  }
});

export default router;
