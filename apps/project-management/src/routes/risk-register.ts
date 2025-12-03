import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Risk Register
router.post('/', async (req, res) => {
  try {
    const riskRegister = await prisma.riskRegister.create({
      data: req.body,
    });
    res.json(riskRegister);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create risk register' });
  }
});

// Get all Risk Registers
router.get('/', async (req, res) => {
  try {
    const riskRegisters = await prisma.riskRegister.findMany();
    res.json(riskRegisters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch risk registers' });
  }
});

// Get Risk Register by ID
router.get('/:id', async (req, res) => {
  try {
    const riskRegister = await prisma.riskRegister.findUnique({
      where: { id: req.params.id },
    });
    if (!riskRegister) {
      res.status(404).json({ error: 'Risk register not found' });
      return;
    }
    res.json(riskRegister);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch risk register' });
  }
});

// Update Risk Register
router.put('/:id', async (req, res) => {
  try {
    const riskRegister = await prisma.riskRegister.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(riskRegister);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update risk register' });
  }
});

// Delete Risk Register
router.delete('/:id', async (req, res) => {
  try {
    await prisma.riskRegister.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Risk register deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete risk register' });
  }
});

export default router;
