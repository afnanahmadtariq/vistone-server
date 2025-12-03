import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Chat Message
router.post('/', async (req, res) => {
  try {
    const chatMessage = await prisma.chatMessage.create({
      data: req.body,
    });
    res.json(chatMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat message' });
  }
});

// Get all Chat Messages
router.get('/', async (req, res) => {
  try {
    const chatMessages = await prisma.chatMessage.findMany();
    res.json(chatMessages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// Get Chat Message by ID
router.get('/:id', async (req, res) => {
  try {
    const chatMessage = await prisma.chatMessage.findUnique({
      where: { id: req.params.id },
    });
    if (!chatMessage) {
      res.status(404).json({ error: 'Chat message not found' });
      return;
    }
    res.json(chatMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat message' });
  }
});

// Update Chat Message
router.put('/:id', async (req, res) => {
  try {
    const chatMessage = await prisma.chatMessage.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(chatMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update chat message' });
  }
});

// Delete Chat Message
router.delete('/:id', async (req, res) => {
  try {
    await prisma.chatMessage.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Chat message deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete chat message' });
  }
});

export default router;
