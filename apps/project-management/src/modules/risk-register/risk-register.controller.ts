import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createRiskRegisterHandler(req: Request, res: Response) {
    try {
    const riskRegister = await prisma.riskRegister.create({
      data: req.body,
    });
    res.json(riskRegister);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create risk register' });
    }
}

export async function getAllRiskRegistersHandler(req: Request, res: Response) {
    try {
    const riskRegisters = await prisma.riskRegister.findMany();
    res.json(riskRegisters);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch risk registers' });
    }
}

export async function getRiskRegisterByIdHandler(req: Request, res: Response) {
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
}

export async function updateRiskRegisterHandler(req: Request, res: Response) {
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
}

export async function deleteRiskRegisterHandler(req: Request, res: Response) {
    try {
    await prisma.riskRegister.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Risk register deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete risk register' });
    }
}
