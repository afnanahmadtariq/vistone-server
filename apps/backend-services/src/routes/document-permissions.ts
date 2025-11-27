import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create DocumentPermission
router.post('/', async (req, res) => {
  try {
    const documentPermission = await prisma.documentPermission.create({
      data: req.body,
    });
    res.json(documentPermission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document permission' });
  }
});

// Get all DocumentPermissions
router.get('/', async (req, res) => {
  try {
    const documentPermissions = await prisma.documentPermission.findMany();
    res.json(documentPermissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document permissions' });
  }
});

// Get DocumentPermission by ID
router.get('/:id', async (req, res) => {
  try {
    const documentPermission = await prisma.documentPermission.findUnique({
      where: { id: req.params.id },
    });
    if (!documentPermission) {
      res.status(404).json({ error: 'Document permission not found' });
      return;
    }
    res.json(documentPermission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document permission' });
  }
});

// Update DocumentPermission
router.put('/:id', async (req, res) => {
  try {
    const documentPermission = await prisma.documentPermission.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(documentPermission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document permission' });
  }
});

// Delete DocumentPermission
router.delete('/:id', async (req, res) => {
  try {
    await prisma.documentPermission.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Document permission deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document permission' });
  }
});

export default router;
