import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create KycData
router.post('/', async (req, res) => {
  try {
    const kycData = await prisma.kycData.create({
      data: req.body,
    });
    res.json(kycData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create KYC data' });
  }
});

// Get all KycData
router.get('/', async (req, res) => {
  try {
    const kycData = await prisma.kycData.findMany();
    res.json(kycData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KYC data' });
  }
});

// Get KycData by ID
router.get('/:id', async (req, res) => {
  try {
    const kycData = await prisma.kycData.findUnique({
      where: { id: req.params.id },
    });
    if (!kycData) {
      res.status(404).json({ error: 'KYC data not found' });
      return;
    }
    res.json(kycData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KYC data' });
  }
});

// Update KycData
router.put('/:id', async (req, res) => {
  try {
    const kycData = await prisma.kycData.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(kycData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update KYC data' });
  }
});

// Delete KycData
router.delete('/:id', async (req, res) => {
  try {
    await prisma.kycData.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'KYC data deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete KYC data' });
  }
});

export default router;
