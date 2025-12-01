import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Wiki Page Version
router.post('/', async (req, res) => {
  try {
    const wikiPageVersion = await prisma.wikiPageVersion.create({
      data: req.body,
    });
    res.json(wikiPageVersion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page version' });
  }
});

// Get all Wiki Page Versions
router.get('/', async (req, res) => {
  try {
    const wikiPageVersions = await prisma.wikiPageVersion.findMany();
    res.json(wikiPageVersions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page versions' });
  }
});

// Get Wiki Page Version by ID
router.get('/:id', async (req, res) => {
  try {
    const wikiPageVersion = await prisma.wikiPageVersion.findUnique({
      where: { id: req.params.id },
    });
    if (!wikiPageVersion) {
      res.status(404).json({ error: 'Wiki page version not found' });
      return;
    }
    res.json(wikiPageVersion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page version' });
  }
});

export default router;
