import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Create MfaSetting
router.post('/', async (req, res) => {
  try {
    const mfaSetting = await prisma.mfaSetting.create({
      data: req.body,
    });
    res.json(mfaSetting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create MFA setting' });
  }
});

// Get all MfaSettings
router.get('/', async (req, res) => {
  try {
    const mfaSettings = await prisma.mfaSetting.findMany();
    res.json(mfaSettings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MFA settings' });
  }
});

// Get MfaSetting by ID
router.get('/:id', async (req, res) => {
  try {
    const mfaSetting = await prisma.mfaSetting.findUnique({
      where: { id: req.params.id },
    });
    if (!mfaSetting) {
      res.status(404).json({ error: 'MFA setting not found' });
      return;
    }
    res.json(mfaSetting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MFA setting' });
  }
});

// Update MfaSetting
router.put('/:id', async (req, res) => {
  try {
    const mfaSetting = await prisma.mfaSetting.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(mfaSetting);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update MFA setting' });
  }
});

// Delete MfaSetting
router.delete('/:id', async (req, res) => {
  try {
    await prisma.mfaSetting.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'MFA setting deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete MFA setting' });
  }
});

export default router;
