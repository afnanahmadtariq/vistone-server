import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ensureDocumentFolderInCallerOrg, ensureWikiInCallerOrg, getCallerOrganizationId } from "../../lib/org-scope";

export async function createDocumentFolderHandler(req: Request, res: Response) {
    try {
    const wikiId = req.body?.wikiId;
    if (typeof wikiId !== 'string' || !wikiId.trim()) {
      res.status(400).json({ error: 'wikiId is required' });
      return;
    }
    if (!(await ensureWikiInCallerOrg(wikiId.trim(), req, res))) return;

    const documentFolder = await prisma.documentFolder.create({
      data: req.body,
    });
    res.json(documentFolder);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document folder' });
    }
}

export async function getAllDocumentFoldersHandler(req: Request, res: Response) {
    try {
    const { wikiId, parentId } = req.query;
    const caller = getCallerOrganizationId(req);
    let resolvedWikiId: string | undefined =
      typeof wikiId === 'string' && wikiId.trim() ? wikiId.trim() : undefined;

    if (caller) {
      if (parentId && !resolvedWikiId) {
        const parent = await prisma.documentFolder.findUnique({
          where: { id: String(parentId) },
          select: { wikiId: true },
        });
        if (!parent) {
          res.status(404).json({ error: 'Document folder not found' });
          return;
        }
        resolvedWikiId = parent.wikiId;
      }
      if (!resolvedWikiId) {
        res.status(400).json({ error: 'wikiId or parentId query parameter is required' });
        return;
      }
      if (!(await ensureWikiInCallerOrg(resolvedWikiId, req, res))) return;
    }

    const where: Record<string, unknown> = {};
    if (wikiId) where.wikiId = String(wikiId);
    if (parentId) where.parentId = String(parentId);
    const documentFolders = await prisma.documentFolder.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(documentFolders);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document folders' });
    }
}

export async function getDocumentFolderByIdHandler(req: Request, res: Response) {
    try {
    if (!(await ensureDocumentFolderInCallerOrg(req.params.id, req, res))) return;

    const documentFolder = await prisma.documentFolder.findUnique({
      where: { id: req.params.id },
    });
    if (!documentFolder) {
      res.status(404).json({ error: 'Document folder not found' });
      return;
    }
    res.json(documentFolder);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document folder' });
    }
}

export async function updateDocumentFolderHandler(req: Request, res: Response) {
    try {
    if (!(await ensureDocumentFolderInCallerOrg(req.params.id, req, res))) return;

    const existing = await prisma.documentFolder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Document folder not found' });
      return;
    }
    const documentFolder = await prisma.documentFolder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(documentFolder);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document folder' });
    }
}

export async function deleteDocumentFolderHandler(req: Request, res: Response) {
    try {
    if (!(await ensureDocumentFolderInCallerOrg(req.params.id, req, res))) return;

    const existing = await prisma.documentFolder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Document folder not found' });
      return;
    }
    // Delete child documents first, then the folder
    await prisma.document.deleteMany({ where: { folderId: req.params.id } });
    await prisma.documentFolder.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Document folder deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document folder' });
    }
}
