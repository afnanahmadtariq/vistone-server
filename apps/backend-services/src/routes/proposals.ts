import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Proposal
router.post('/', async (req, res) => {
  try {
    const proposal = await prisma.proposal.create({
      data: req.body,
    });
    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Get all Proposals
router.get('/', async (req, res) => {
  try {
    const proposals = await prisma.proposal.findMany();
    res.json(proposals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Get Proposal by ID
router.get('/:id', async (req, res) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
    });
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// Update Proposal
router.put('/:id', async (req, res) => {
  try {
    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(proposal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// Delete Proposal
router.delete('/:id', async (req, res) => {
  try {
    await prisma.proposal.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Proposal deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
});

export default router;
