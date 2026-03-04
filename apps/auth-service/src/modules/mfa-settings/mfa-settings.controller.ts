import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createMfaSettingHandler(req: Request, res: Response) {
    try {
    const mfaSetting = await prisma.mfaSetting.create({
      data: req.body,
    });
    res.json(mfaSetting);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create MFA setting' });
    }
}

export async function getAllMfaSettingsHandler(req: Request, res: Response) {
    try {
    const mfaSettings = await prisma.mfaSetting.findMany();
    res.json(mfaSettings);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MFA settings' });
    }
}

export async function getMfaSettingByIdHandler(req: Request, res: Response) {
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
}

export async function updateMfaSettingHandler(req: Request, res: Response) {
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
}

export async function deleteMfaSettingHandler(req: Request, res: Response) {
    try {
    await prisma.mfaSetting.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'MFA setting deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete MFA setting' });
    }
}
