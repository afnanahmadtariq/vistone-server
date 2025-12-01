import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Channel Member
router.post('/', async (req, res) => {
  try {
    const channelMember = await prisma.channelMember.create({
      data: req.body,
    });
    res.json(channelMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create channel member' });
  }
});

// Get all Channel Members
router.get('/', async (req, res) => {
  try {
    const channelMembers = await prisma.channelMember.findMany();
    res.json(channelMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel members' });
  }
});

// Get Channel Member by ID
router.get('/:id', async (req, res) => {
  try {
    const channelMember = await prisma.channelMember.findUnique({
      where: { id: req.params.id },
    });
    if (!channelMember) {
      res.status(404).json({ error: 'Channel member not found' });
      return;
    }
    res.json(channelMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel member' });
  }
});

// Update Channel Member
router.put('/:id', async (req, res) => {
  try {
    const channelMember = await prisma.channelMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(channelMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update channel member' });
  }
});

// Delete Channel Member
router.delete('/:id', async (req, res) => {
  try {
    await prisma.channelMember.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Channel member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete channel member' });
  }
});

export default router;
