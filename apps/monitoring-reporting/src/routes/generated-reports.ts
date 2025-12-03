import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create Generated Report
router.post('/', async (req, res) => {
  try {
    const generatedReport = await prisma.generatedReport.create({
      data: req.body,
    });
    res.json(generatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create generated report' });
  }
});

// Get all Generated Reports
router.get('/', async (req, res) => {
  try {
    const generatedReports = await prisma.generatedReport.findMany();
    res.json(generatedReports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch generated reports' });
  }
});

// Get Generated Report by ID
router.get('/:id', async (req, res) => {
  try {
    const generatedReport = await prisma.generatedReport.findUnique({
      where: { id: req.params.id },
    });
    if (!generatedReport) {
      res.status(404).json({ error: 'Generated report not found' });
      return;
    }
    res.json(generatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch generated report' });
  }
});

export default router;
