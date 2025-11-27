import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create GeneratedReport
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

// Get all GeneratedReports
router.get('/', async (req, res) => {
  try {
    const generatedReports = await prisma.generatedReport.findMany();
    res.json(generatedReports);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch generated reports' });
  }
});

// Get GeneratedReport by ID
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

// Update GeneratedReport
router.put('/:id', async (req, res) => {
  try {
    const generatedReport = await prisma.generatedReport.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(generatedReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update generated report' });
  }
});

// Delete GeneratedReport
router.delete('/:id', async (req, res) => {
  try {
    await prisma.generatedReport.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Generated report deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete generated report' });
  }
});

export default router;
