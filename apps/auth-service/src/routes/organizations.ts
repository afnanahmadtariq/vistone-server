import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Organization
router.post('/', async (req, res) => {
  try {
    const organization = await prisma.organization.create({
      data: req.body,
    });
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get all Organizations
router.get('/', async (req, res) => {
  try {
    const organizations = await prisma.organization.findMany();
    res.json(organizations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get Organization by ID
router.get('/:id', async (req, res) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
    });
    if (!organization) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Update Organization
router.put('/:id', async (req, res) => {
  try {
    const organization = await prisma.organization.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(organization);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete Organization
router.delete('/:id', async (req, res) => {
  try {
    await prisma.organization.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

export default router;
