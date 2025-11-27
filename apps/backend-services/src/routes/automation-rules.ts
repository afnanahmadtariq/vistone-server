import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create AutomationRule
router.post('/', async (req, res) => {
  try {
    const automationRule = await prisma.automationRule.create({
      data: req.body,
    });
    res.json(automationRule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// Get all AutomationRules
router.get('/', async (req, res) => {
  try {
    const automationRules = await prisma.automationRule.findMany();
    res.json(automationRules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

// Get AutomationRule by ID
router.get('/:id', async (req, res) => {
  try {
    const automationRule = await prisma.automationRule.findUnique({
      where: { id: req.params.id },
    });
    if (!automationRule) {
      res.status(404).json({ error: 'Automation rule not found' });
      return;
    }
    res.json(automationRule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch automation rule' });
  }
});

// Update AutomationRule
router.put('/:id', async (req, res) => {
  try {
    const automationRule = await prisma.automationRule.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(automationRule);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

// Delete AutomationRule
router.delete('/:id', async (req, res) => {
  try {
    await prisma.automationRule.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Automation rule deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

export default router;
