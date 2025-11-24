import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create OrganizationMember
router.post('/', async (req, res) => {
  try {
    const organizationMember = await prisma.organizationMember.create({
      data: req.body,
    });
    res.json(organizationMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization member' });
  }
});

// Get all OrganizationMembers
router.get('/', async (req, res) => {
  try {
    const organizationMembers = await prisma.organizationMember.findMany();
    res.json(organizationMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization members' });
  }
});

// Get OrganizationMember by ID
router.get('/:id', async (req, res) => {
  try {
    const organizationMember = await prisma.organizationMember.findUnique({
      where: { id: req.params.id },
    });
    if (!organizationMember) {
      res.status(404).json({ error: 'Organization member not found' });
      return;
    }
    res.json(organizationMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization member' });
  }
});

// Update OrganizationMember
router.put('/:id', async (req, res) => {
  try {
    const organizationMember = await prisma.organizationMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(organizationMember);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update organization member' });
  }
});

// Delete OrganizationMember
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
