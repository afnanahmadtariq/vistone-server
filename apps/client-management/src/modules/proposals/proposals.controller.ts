import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createProposalHandler(req: Request, res: Response) {
    try {
    const proposal = await prisma.proposal.create({
      data: req.body,
    });
    res.json(proposal);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create proposal' });
    }
}

export async function getAllProposalsHandler(req: Request, res: Response) {
    try {
    const proposals = await prisma.proposal.findMany();
    res.json(proposals);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
    }
}

export async function getProposalByIdHandler(req: Request, res: Response) {
    try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: req.params.id },
    });
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found' });
      return;
    }
    res.json(proposal);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
    }
}

export async function updateProposalHandler(req: Request, res: Response) {
    try {
    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(proposal);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update proposal' });
    }
}

export async function deleteProposalHandler(req: Request, res: Response) {
    try {
    await prisma.proposal.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Proposal deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete proposal' });
    }
}
