import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create KPI Measurement
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

// Get all KPI Measurements
router.get('/', async (req, res) => {
  try {
    const kpiMeasurements = await prisma.kpiMeasurement.findMany();
    res.json(kpiMeasurements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KPI measurements' });
  }
});

// Get KPI Measurement by ID
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

export default router;
