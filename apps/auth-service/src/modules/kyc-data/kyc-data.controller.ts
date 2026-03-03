import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createKycDataHandler(req: Request, res: Response) {
    try {
    const kycData = await prisma.kycData.create({
      data: req.body,
    });
    res.json(kycData);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create KYC data' });
    }
}

export async function getAllKycDataHandler(req: Request, res: Response) {
    try {
    const kycData = await prisma.kycData.findMany();
    res.json(kycData);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KYC data' });
    }
}

export async function getKycDataByIdHandler(req: Request, res: Response) {
    try {
    const kycData = await prisma.kycData.findUnique({
      where: { id: req.params.id },
    });
    if (!kycData) {
      res.status(404).json({ error: 'KYC data not found' });
      return;
    }
    res.json(kycData);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch KYC data' });
    }
}

export async function updateKycDataHandler(req: Request, res: Response) {
    try {
    const kycData = await prisma.kycData.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(kycData);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update KYC data' });
    }
}

export async function deleteKycDataHandler(req: Request, res: Response) {
    try {
    await prisma.kycData.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'KYC data deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete KYC data' });
    }
}
