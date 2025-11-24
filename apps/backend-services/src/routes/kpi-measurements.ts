import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create KpiMeasurement
router.post('/', async (req, res) => {
  try {
    const kpiMeasurement = await prisma.kpiMeasurement.create({
      data: req.body,
    });
    res.json(kpiMeasurement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create KPI measurement' });
  }
});

// Get all KpiMeasurements
router.get('/', async (req, res) => {
  try {
    const kpiMeasurements = await prisma.kpiMeasurement.findMany();
    res.json(kpiMeasurements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI measurements' });
  }
});

// Get KpiMeasurement by ID
router.get('/:id', async (req, res) => {
  try {
    const kpiMeasurement = await prisma.kpiMeasurement.findUnique({
      where: { id: req.params.id },
    });
    if (!kpiMeasurement) {
      res.status(404).json({ error: 'KPI measurement not found' });
      return;
    }
    res.json(kpiMeasurement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI measurement' });
  }
});

// Update KpiMeasurement
router.put('/:id', async (req, res) => {
  try {
    const kpiMeasurement = await prisma.kpiMeasurement.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(kpiMeasurement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update KPI measurement' });
  }
});

// Delete KpiMeasurement
router.delete('/:id', async (req, res) => {
  try {
    await prisma.kpiMeasurement.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'KPI measurement deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete KPI measurement' });
  }
});

export default router;
