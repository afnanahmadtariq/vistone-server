import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ensureWikiInCallerOrg, ensureWikiPageInCallerOrg, getCallerOrganizationId } from "../../lib/org-scope";

export async function createWikiPageHandler(req: Request, res: Response) {
    try {
    const wikiId = req.body?.wikiId;
    if (typeof wikiId !== 'string' || !wikiId.trim()) {
      res.status(400).json({ error: 'wikiId is required' });
      return;
    }
    if (!(await ensureWikiInCallerOrg(wikiId.trim(), req, res))) return;

    const wikiPage = await prisma.wikiPage.create({
      data: req.body,
    });
    res.json(wikiPage);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page' });
    }
}

export async function getAllWikiPagesHandler(req: Request, res: Response) {
    try {
    const { wikiId } = req.query ?? {};
    const caller = getCallerOrganizationId(req);
    if (caller) {
      if (typeof wikiId !== 'string' || !wikiId.trim()) {
        res.status(400).json({ error: 'wikiId query parameter is required' });
        return;
      }
      if (!(await ensureWikiInCallerOrg(wikiId.trim(), req, res))) return;
    }
    const where: Record<string, unknown> = {};
    if (typeof wikiId === 'string' && wikiId.trim() !== '') {
      where.wikiId = wikiId.trim();
    }
    const wikiPages = await prisma.wikiPage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    res.json(wikiPages);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki pages' });
    }
}

export async function getWikiPageByIdHandler(req: Request, res: Response) {
    try {
    if (!(await ensureWikiPageInCallerOrg(req.params.id, req, res))) return;

    const wikiPage = await prisma.wikiPage.findUnique({
      where: { id: req.params.id },
    });
    if (!wikiPage) {
      res.status(404).json({ error: 'Wiki page not found' });
      return;
    }
    res.json(wikiPage);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page' });
    }
}

export async function updateWikiPageHandler(req: Request, res: Response) {
    try {
    if (!(await ensureWikiPageInCallerOrg(req.params.id, req, res))) return;

    const wikiPage = await prisma.wikiPage.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(wikiPage);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update wiki page' });
    }
}

export async function deleteWikiPageHandler(req: Request, res: Response) {
    try {
    if (!(await ensureWikiPageInCallerOrg(req.params.id, req, res))) return;

    await prisma.wikiPage.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Wiki page deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete wiki page' });
    }
}
