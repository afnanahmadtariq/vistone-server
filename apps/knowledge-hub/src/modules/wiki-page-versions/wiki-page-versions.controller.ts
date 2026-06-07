import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ensureWikiPageInCallerOrg } from "../../lib/org-scope";

export async function createWikiPageVersionHandler(req: Request, res: Response) {
    try {
    const wikiPageId = req.body?.wikiPageId;
    if (typeof wikiPageId !== 'string' || !wikiPageId.trim()) {
      res.status(400).json({ error: 'wikiPageId is required' });
      return;
    }
    if (!(await ensureWikiPageInCallerOrg(wikiPageId.trim(), req, res))) return;

    const wikiPageVersion = await prisma.wikiPageVersion.create({
      data: req.body,
    });
    res.json(wikiPageVersion);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page version' });
    }
}

export async function getAllWikiPageVersionsHandler(req: Request, res: Response) {
    try {
    const wikiPageId = req.query.wikiPageId;
    if (typeof wikiPageId !== 'string' || !wikiPageId.trim()) {
      res.status(400).json({ error: 'wikiPageId query parameter is required' });
      return;
    }
    if (!(await ensureWikiPageInCallerOrg(wikiPageId.trim(), req, res))) return;

    const wikiPageVersions = await prisma.wikiPageVersion.findMany({
      where: { wikiPageId: wikiPageId.trim() },
      orderBy: { version: 'desc' },
    });
    res.json(wikiPageVersions);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page versions' });
    }
}

export async function getWikiPageVersionByIdHandler(req: Request, res: Response) {
    try {
    const wikiPageVersion = await prisma.wikiPageVersion.findUnique({
      where: { id: req.params.id },
    });
    if (!wikiPageVersion) {
      res.status(404).json({ error: 'Wiki page version not found' });
      return;
    }
    if (!(await ensureWikiPageInCallerOrg(wikiPageVersion.wikiPageId, req, res))) return;

    res.json(wikiPageVersion);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page version' });
    }
}
