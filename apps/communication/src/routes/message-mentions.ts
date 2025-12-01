import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Message Mention
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

// Get all Message Mentions
router.get('/', async (req, res) => {
  try {
    const messageMentions = await prisma.messageMention.findMany();
    res.json(messageMentions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message mentions' });
  }
});

// Get Message Mention by ID
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

export default router;
