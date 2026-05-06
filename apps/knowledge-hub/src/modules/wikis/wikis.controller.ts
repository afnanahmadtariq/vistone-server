import { Request, Response } from 'express';
import type { RequestWithInternalUser } from '@vistone-server/shared-internal-auth';
import { normalizeOrgEntityNameKey } from '@vistone-server/shared-internal-auth';
import prisma from '../../lib/prisma';
import { ensureQueryOrgMatchesCaller, ensureWikiInCallerOrg } from '../../lib/org-scope';

async function wikiNameTaken(
    organizationId: string,
    name: string,
    excludeWikiId?: string
): Promise<boolean> {
    const key = normalizeOrgEntityNameKey(name);
    if (!key) return false;
    const rows = await prisma.wiki.findMany({
        where: { organizationId },
        select: { id: true, name: true },
    });
    return rows.some(
        (w: { id: string; name: string }) =>
            w.id !== excludeWikiId && normalizeOrgEntityNameKey(w.name) === key
    );
}

export async function createWiki(req: Request, res: Response): Promise<void> {
    try {
        const orgId = req.body?.organizationId;
        if (typeof orgId !== 'string' || !orgId.trim()) {
            res.status(400).json({ error: 'organizationId is required' });
            return;
        }
        const rawName = req.body?.name;
        if (typeof rawName !== 'string' || !rawName.trim()) {
            res.status(400).json({ error: 'name is required' });
            return;
        }
        if (!ensureQueryOrgMatchesCaller(req, orgId.trim(), res)) return;

        if (await wikiNameTaken(orgId.trim(), rawName)) {
            res.status(409).json({
                error: 'A wiki with this name already exists in your organization.',
            });
            return;
        }

        const wiki = await prisma.wiki.create({
            data: req.body,
            include: { pages: true, folders: true, documents: true }
        });

        // So the creator appears in the API gateway `wikis` list for non-organizers
        // (access is otherwise limited to project-linked wikis + explicit wiki members).
        const creatorId = (req as RequestWithInternalUser).internalUser?.id;
        if (creatorId) {
            try {
                await prisma.wikiMember.create({
                    data: {
                        wikiId: wiki.id,
                        userId: creatorId,
                        role: 'admin',
                    },
                });
            } catch (memberErr: unknown) {
                const code =
                    memberErr && typeof memberErr === 'object' && 'code' in memberErr
                        ? (memberErr as { code?: string }).code
                        : '';
                if (code === 'P2002') {
                    // already a member (idempotent)
                } else {
                    console.error('[createWiki] failed to add creator as wiki member:', memberErr);
                }
            }
        }

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

        const existing = await prisma.wiki.findUnique({
            where: { id },
            select: { organizationId: true },
        });
        if (!existing) {
            res.status(404).json({ error: 'Wiki not found' });
            return;
        }

        if (req.body?.name !== undefined && req.body?.name !== null) {
            const nextName = req.body.name;
            if (typeof nextName !== 'string' || !nextName.trim()) {
                res.status(400).json({ error: 'name cannot be empty' });
                return;
            }
            if (await wikiNameTaken(existing.organizationId, nextName, id)) {
                res.status(409).json({
                    error: 'A wiki with this name already exists in your organization.',
                });
                return;
            }
        }

        const nextOrg = req.body?.organizationId;
        if (typeof nextOrg === 'string' && nextOrg.trim() && !ensureQueryOrgMatchesCaller(req, nextOrg.trim(), res)) return;

        const data: Record<string, unknown> = { ...req.body };
        if (data.metadata !== undefined && typeof data.metadata === 'object' && data.metadata !== null) {
            const prev = await prisma.wiki.findUnique({
                where: { id },
                select: { metadata: true },
            });
            const prevMeta =
                prev?.metadata && typeof prev.metadata === 'object' && !Array.isArray(prev.metadata)
                    ? (prev.metadata as Record<string, unknown>)
                    : {};
            data.metadata = { ...prevMeta, ...(data.metadata as Record<string, unknown>) };
        }

        const wiki = await prisma.wiki.update({
            where: { id },
            data,
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
