import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Message Attachment
router.post('/', async (req, res) => {
  try {
    const messageAttachment = await prisma.messageAttachment.create({
      data: req.body,
    });
    res.json(messageAttachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create message attachment' });
  }
});

// Get all Message Attachments
router.get('/', async (req, res) => {
  try {
    const messageAttachments = await prisma.messageAttachment.findMany();
    res.json(messageAttachments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message attachments' });
  }
});

// Get Message Attachment by ID
router.get('/:id', async (req, res) => {
  try {
    const messageAttachment = await prisma.messageAttachment.findUnique({
      where: { id: req.params.id },
    });
    if (!messageAttachment) {
      res.status(404).json({ error: 'Message attachment not found' });
      return;
    }
    res.json(messageAttachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message attachment' });
  }
});

export default router;
