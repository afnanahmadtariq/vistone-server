import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create AI Conversation
router.post('/', async (req, res) => {
  try {
    const aiConversation = await prisma.aiConversation.create({
      data: req.body,
    });
    res.json(aiConversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create AI conversation' });
  }
});

// Get all AI Conversations
router.get('/', async (req, res) => {
  try {
    const aiConversations = await prisma.aiConversation.findMany();
    res.json(aiConversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI conversations' });
  }
});

// Get AI Conversation by ID
router.get('/:id', async (req, res) => {
  try {
    const aiConversation = await prisma.aiConversation.findUnique({
      where: { id: req.params.id },
    });
    if (!aiConversation) {
      res.status(404).json({ error: 'AI conversation not found' });
      return;
    }
    res.json(aiConversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI conversation' });
  }
});

// Update AI Conversation
router.put('/:id', async (req, res) => {
  try {
    const aiConversation = await prisma.aiConversation.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(aiConversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update AI conversation' });
  }
});

// Delete AI Conversation
router.delete('/:id', async (req, res) => {
  try {
    await prisma.aiConversation.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'AI conversation deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete AI conversation' });
  }
});

export default router;
