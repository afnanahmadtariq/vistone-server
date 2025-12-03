import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Document
router.post('/', async (req, res) => {
  try {
    const document = await prisma.document.create({
      data: req.body,
    });
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Get all Documents
router.get('/', async (req, res) => {
  try {
    const documents = await prisma.document.findMany();
    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get Document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Update Document
router.put('/:id', async (req, res) => {
  try {
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete Document
router.delete('/:id', async (req, res) => {
  try {
    await prisma.document.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
