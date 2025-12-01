import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Document Folder
router.post('/', async (req, res) => {
  try {
    const documentFolder = await prisma.documentFolder.create({
      data: req.body,
    });
    res.json(documentFolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document folder' });
  }
});

// Get all Document Folders
router.get('/', async (req, res) => {
  try {
    const documentFolders = await prisma.documentFolder.findMany();
    res.json(documentFolders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document folders' });
  }
});

// Get Document Folder by ID
router.get('/:id', async (req, res) => {
  try {
    const documentFolder = await prisma.documentFolder.findUnique({
      where: { id: req.params.id },
    });
    if (!documentFolder) {
      res.status(404).json({ error: 'Document folder not found' });
      return;
    }
    res.json(documentFolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document folder' });
  }
});

// Update Document Folder
router.put('/:id', async (req, res) => {
  try {
    const documentFolder = await prisma.documentFolder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(documentFolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document folder' });
  }
});

// Delete Document Folder
router.delete('/:id', async (req, res) => {
  try {
    await prisma.documentFolder.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Document folder deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document folder' });
  }
});

export default router;
