import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export async function createWiki(req: Request, res: Response): Promise<void> {
    try {
        const wiki = await prisma.wiki.create({
            data: req.body,
            include: { pages: true, folders: true, documents: true }
        });
        res.status(201).json(wiki);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create wiki' });
    }
}

export async function getWikis(req: Request, res: Response): Promise<void> {
    try {
        const { organizationId } = req.query;
        if (!organizationId) {
            res.status(400).json({ error: 'organizationId query is required' });
            return;
        }
        const wikis = await prisma.wiki.findMany({
            where: { organizationId: String(organizationId) },
            include: {
                pages: true,
                folders: true,
                documents: true,
                projectLinks: true,
            }
        });
        res.json(wikis);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wikis' });
    }
}

export async function getWikiById(req: Request, res: Response): Promise<void> {
    try {
        const wiki = await prisma.wiki.findUnique({
            where: { id: req.params.id },
            include: {
                pages: true,
                folders: true,
                documents: true,
                projectLinks: true,
            }
        });
        if (!wiki) {
            res.status(404).json({ error: 'Wiki not found' });
            return;
        }
        res.json(wiki);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wiki' });
    }
}

export async function updateWiki(req: Request, res: Response): Promise<void> {
    try {
        const wiki = await prisma.wiki.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json(wiki);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update wiki' });
    }
}

export async function deleteWiki(req: Request, res: Response): Promise<void> {
    try {
        await prisma.wiki.delete({
            where: { id: req.params.id },
        });
        res.json({ success: true, message: 'Wiki deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete wiki' });
    }
}
