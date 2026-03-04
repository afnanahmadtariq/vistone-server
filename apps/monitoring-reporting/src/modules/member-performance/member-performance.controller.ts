import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createMemberPerformanceHandler(req: Request, res: Response) {
    try {
    const memberPerformance = await prisma.memberPerformance.create({
      data: req.body,
    });
    res.json(memberPerformance);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create member performance' });
    }
}

export async function getAllMemberPerformancesHandler(req: Request, res: Response) {
    try {
    const memberPerformances = await prisma.memberPerformance.findMany();
    res.json(memberPerformances);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch member performances' });
    }
}

export async function getMemberPerformanceByIdHandler(req: Request, res: Response) {
    try {
    const memberPerformance = await prisma.memberPerformance.findUnique({
      where: { id: req.params.id },
    });
    if (!memberPerformance) {
      res.status(404).json({ error: 'Member performance not found' });
      return;
    }
    res.json(memberPerformance);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch member performance' });
    }
}
