import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create DocumentLink
router.post('/', async (req, res) => {
  try {
    const documentLink = await prisma.documentLink.create({
      data: req.body,
    });
    res.json(documentLink);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document link' });
  }
});

// Get all DocumentLinks
router.get('/', async (req, res) => {
  try {
    const documentLinks = await prisma.documentLink.findMany();
    res.json(documentLinks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document links' });
  }
});

// Get DocumentLink by ID
router.get('/:id', async (req, res) => {
  try {
    const documentLink = await prisma.documentLink.findUnique({
      where: { id: req.params.id },
    });
    if (!documentLink) {
      res.status(404).json({ error: 'Document link not found' });
      return;
    }
    res.json(documentLink);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document link' });
  }
});

// Update DocumentLink
router.put('/:id', async (req, res) => {
  try {
    const documentLink = await prisma.documentLink.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(documentLink);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document link' });
  }
});

// Delete DocumentLink
router.delete('/:id', async (req, res) => {
  try {
    await prisma.documentLink.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Document link deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document link' });
  }
});

export default router;
