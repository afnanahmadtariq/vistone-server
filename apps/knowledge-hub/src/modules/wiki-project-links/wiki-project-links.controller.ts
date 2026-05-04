import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export async function createWikiProjectLink(req: Request, res: Response): Promise<void> {
    try {
        const { wikiId, projectId } = req.body;

        // Enforce 1:1: check if this wiki is already linked to any project
        const existingWikiLink = await prisma.wikiProjectLink.findUnique({ where: { wikiId } });
        if (existingWikiLink) {
            res.status(400).json({ error: 'This wiki is already linked to a project. Each wiki can only be linked to one project.' });
            return;
        }

        // Enforce 1:1: check if this project already has a wiki linked
        const existingProjectLink = await prisma.wikiProjectLink.findUnique({ where: { projectId } });
        if (existingProjectLink) {
            res.status(400).json({ error: 'This project already has a wiki linked. Each project can only have one wiki.' });
            return;
        }

        const link = await prisma.wikiProjectLink.create({
            data: req.body,
        });
        res.status(201).json(link);
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'This wiki is already linked to a project' });
            return;
        }
        res.status(500).json({ error: 'Failed to create wiki project link' });
    }
}

export async function deleteWikiProjectLink(req: Request, res: Response): Promise<void> {
    try {
        const existing = await prisma.wikiProjectLink.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            res.status(404).json({ error: 'Wiki project link not found' });
            return;
        }
        await prisma.wikiProjectLink.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: 'Link deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete link' });
    }
}

export async function getWikiProjectLinks(req: Request, res: Response): Promise<void> {
    try {
        const { projectId, wikiId } = req.query;

        // allow filtering by either side
        const where: any = {};
        if (projectId) where.projectId = String(projectId);
        if (wikiId) where.wikiId = String(wikiId);

        const links = await prisma.wikiProjectLink.findMany({
            where,
            include: { wiki: true }
        });
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wiki links' });
    }
}
