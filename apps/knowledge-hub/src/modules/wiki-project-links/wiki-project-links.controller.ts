import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export async function createWikiProjectLink(req: Request, res: Response): Promise<void> {
    try {
        const link = await prisma.wikiProjectLink.create({
            data: req.body,
        });
        res.status(201).json(link);
    } catch (error: any) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'This wiki is already linked to this project' });
            return;
        }
        res.status(500).json({ error: 'Failed to create wiki project link' });
    }
}

export async function deleteWikiProjectLink(req: Request, res: Response): Promise<void> {
    try {
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
