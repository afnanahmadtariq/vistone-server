import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create KPI Definition
router.post('/', async (req, res) => {
  try {
    const kpiDefinition = await prisma.kpiDefinition.create({
      data: req.body,
    });
    res.json(kpiDefinition);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create KPI definition' });
  }
});

// Get all KPI Definitions
router.get('/', async (req, res) => {
  try {
    const kpiDefinitions = await prisma.kpiDefinition.findMany();
    res.json(kpiDefinitions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI definitions' });
  }
});

// Get KPI Definition by ID
router.get('/:id', async (req, res) => {
  try {
    const kpiDefinition = await prisma.kpiDefinition.findUnique({
      where: { id: req.params.id },
    });
    if (!kpiDefinition) {
      res.status(404).json({ error: 'KPI definition not found' });
      return;
    }
    res.json(kpiDefinition);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI definition' });
  }
});

// Update KPI Definition
router.put('/:id', async (req, res) => {
  try {
    const kpiDefinition = await prisma.kpiDefinition.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(kpiDefinition);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update KPI definition' });
  }
});

// Delete KPI Definition
router.delete('/:id', async (req, res) => {
  try {
    await prisma.kpiDefinition.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'KPI definition deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete KPI definition' });
  }
});

export default router;
