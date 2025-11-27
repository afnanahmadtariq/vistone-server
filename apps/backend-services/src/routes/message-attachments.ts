import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create MessageAttachment
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

// Get all MessageAttachments
router.get('/', async (req, res) => {
  try {
    const messageAttachments = await prisma.messageAttachment.findMany();
    res.json(messageAttachments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message attachments' });
  }
});

// Get MessageAttachment by ID
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

// Update MessageAttachment
router.put('/:id', async (req, res) => {
  try {
    const messageAttachment = await prisma.messageAttachment.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(messageAttachment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update message attachment' });
  }
});

// Delete MessageAttachment
router.delete('/:id', async (req, res) => {
  try {
    await prisma.messageAttachment.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Message attachment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete message attachment' });
  }
});

export default router;
