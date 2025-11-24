import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create MessageMention
router.post('/', async (req, res) => {
  try {
    const messageMention = await prisma.messageMention.create({
      data: req.body,
    });
    res.json(messageMention);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create message mention' });
  }
});

// Get all MessageMentions
router.get('/', async (req, res) => {
  try {
    const messageMentions = await prisma.messageMention.findMany();
    res.json(messageMentions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message mentions' });
  }
});

// Get MessageMention by ID
router.get('/:id', async (req, res) => {
  try {
    const messageMention = await prisma.messageMention.findUnique({
      where: { id: req.params.id },
    });
    if (!messageMention) {
      res.status(404).json({ error: 'Message mention not found' });
      return;
    }
    res.json(messageMention);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message mention' });
  }
});

// Update MessageMention
router.put('/:id', async (req, res) => {
  try {
    const messageMention = await prisma.messageMention.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(messageMention);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update message mention' });
  }
});

// Delete MessageMention
router.delete('/:id', async (req, res) => {
  try {
    await prisma.messageMention.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Message mention deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete message mention' });
  }
});

export default router;
