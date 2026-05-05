import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { ensureQueryOrgMatchesCaller, ensureWikiInCallerOrg } from '../../lib/org-scope';

export async function createWiki(req: Request, res: Response): Promise<void> {
    try {
        const orgId = req.body?.organizationId;
        if (typeof orgId !== 'string' || !orgId.trim()) {
            res.status(400).json({ error: 'organizationId is required' });
            return;
        }
        if (!ensureQueryOrgMatchesCaller(req, orgId.trim(), res)) return;

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
        const oid = String(organizationId);
        if (!ensureQueryOrgMatchesCaller(req, oid, res)) return;

        const wikis = await prisma.wiki.findMany({
            where: { organizationId: oid },
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
        const id = req.params.id;
        if (!(await ensureWikiInCallerOrg(id, req, res))) return;

        const wiki = await prisma.wiki.findUnique({
            where: { id },
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
        const id = req.params.id;
        if (!(await ensureWikiInCallerOrg(id, req, res))) return;

        const nextOrg = req.body?.organizationId;
        if (typeof nextOrg === 'string' && nextOrg.trim() && !ensureQueryOrgMatchesCaller(req, nextOrg.trim(), res)) return;

        const wiki = await prisma.wiki.update({
            where: { id },
            data: req.body,
        });
        res.json(wiki);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update wiki' });
    }
}

export async function deleteWiki(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id;
        if (!(await ensureWikiInCallerOrg(id, req, res))) return;

        await prisma.wiki.delete({
            where: { id },
        });
        res.json({ success: true, message: 'Wiki deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete wiki' });
    }
}
