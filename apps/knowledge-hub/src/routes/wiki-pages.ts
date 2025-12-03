import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Wiki Page
router.post('/', async (req, res) => {
  try {
    const wikiPage = await prisma.wikiPage.create({
      data: req.body,
    });
    res.json(wikiPage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page' });
  }
});

// Get all Wiki Pages
router.get('/', async (req, res) => {
  try {
    const wikiPages = await prisma.wikiPage.findMany();
    res.json(wikiPages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki pages' });
  }
});

// Get Wiki Page by ID
router.get('/:id', async (req, res) => {
  try {
    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: req.params.id },
    });
    if (!wikiPage) {
      res.status(404).json({ error: 'Wiki page not found' });
      return;
    }
    res.json(wikiPage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page' });
  }
});

// Update Wiki Page
router.put('/:id', async (req, res) => {
  try {
    const wikiPage = await prisma.wikiPage.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(wikiPage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update wiki page' });
  }
});

// Delete Wiki Page
router.delete('/:id', async (req, res) => {
  try {
    await prisma.wikiPage.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Wiki page deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete wiki page' });
  }
});

export default router;
