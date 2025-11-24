import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create ReportTemplate
router.post('/', async (req, res) => {
  try {
    const reportTemplate = await prisma.reportTemplate.create({
      data: req.body,
    });
    res.json(reportTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create report template' });
  }
});

// Get all ReportTemplates
router.get('/', async (req, res) => {
  try {
    const reportTemplates = await prisma.reportTemplate.findMany();
    res.json(reportTemplates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report templates' });
  }
});

// Get ReportTemplate by ID
router.get('/:id', async (req, res) => {
  try {
    const reportTemplate = await prisma.reportTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!reportTemplate) {
      res.status(404).json({ error: 'Report template not found' });
      return;
    }
    res.json(reportTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch report template' });
  }
});

// Update ReportTemplate
router.put('/:id', async (req, res) => {
  try {
    const reportTemplate = await prisma.reportTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(reportTemplate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update report template' });
  }
});

// Delete ReportTemplate
router.delete('/:id', async (req, res) => {
  try {
    await prisma.reportTemplate.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Report template deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete report template' });
  }
});

export default router;
