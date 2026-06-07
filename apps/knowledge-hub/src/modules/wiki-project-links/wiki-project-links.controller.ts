import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { ensureWikiInCallerOrg, getCallerOrganizationId } from '../../lib/org-scope';

export async function createWikiProjectLink(req: Request, res: Response): Promise<void> {
    try {
        const { wikiId, projectId } = req.body;

        if (typeof wikiId !== 'string' || !wikiId.trim() || projectId == null || String(projectId) === '') {
            res.status(400).json({ error: 'wikiId and projectId are required' });
            return;
        }
        if (!(await ensureWikiInCallerOrg(wikiId.trim(), req, res))) return;

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
        if (!(await ensureWikiInCallerOrg(existing.wikiId, req, res))) return;

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

        if (!projectId && !wikiId) {
            res.status(400).json({ error: 'Provide wikiId and/or projectId' });
            return;
        }

        const caller = getCallerOrganizationId(req);

        const where: Record<string, unknown> = {};
        if (projectId) where.projectId = String(projectId);
        if (wikiId) where.wikiId = String(wikiId);

        if (caller && wikiId) {
            if (!(await ensureWikiInCallerOrg(String(wikiId), req, res))) return;
        }

        let links = await prisma.wikiProjectLink.findMany({
            where,
            include: { wiki: true }
        });

        if (caller && projectId && !wikiId) {
            links = links.filter((l: { wiki: { organizationId: string } }) => l.wiki.organizationId === caller);
        }

        res.json(links);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch wiki links' });
    }
}
