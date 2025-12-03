import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Organization Member
router.post('/', async (req, res) => {
  try {
    const member = await prisma.organizationMember.create({
      data: req.body,
    });
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization member' });
  }
});

// Get all Organization Members
router.get('/', async (req, res) => {
  try {
    const members = await prisma.organizationMember.findMany();
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization members' });
  }
});

// Get Organization Member by ID
router.get('/:id', async (req, res) => {
  try {
    const member = await prisma.organizationMember.findUnique({
      where: { id: req.params.id },
    });
    if (!member) {
      res.status(404).json({ error: 'Organization member not found' });
      return;
    }
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization member' });
  }
});

// Update Organization Member
router.put('/:id', async (req, res) => {
  try {
    const member = await prisma.organizationMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update organization member' });
  }
});

// Delete Organization Member
router.delete('/:id', async (req, res) => {
  try {
    await prisma.organizationMember.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Organization member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete organization member' });
  }
});

export default router;
