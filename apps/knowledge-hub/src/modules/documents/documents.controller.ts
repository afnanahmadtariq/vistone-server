import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ensureDocumentInCallerOrg, ensureWikiInCallerOrg, getCallerOrganizationId } from "../../lib/org-scope";

export async function createDocumentHandler(req: Request, res: Response) {
    try {
    const wikiId = req.body?.wikiId;
    if (typeof wikiId !== 'string' || !wikiId.trim()) {
      res.status(400).json({ error: 'wikiId is required' });
      return;
    }
    if (!(await ensureWikiInCallerOrg(wikiId.trim(), req, res))) return;

    // Strip organizationId from body — it's required by validation for auth
    // but the Document model doesn't have this field in the DB schema.
    const { organizationId, ...documentData } = req.body;
    const document = await prisma.document.create({
      data: documentData,
    });
    res.json(document);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document' });
    }
}

export async function getAllDocumentsHandler(req: Request, res: Response) {
    try {
    const { wikiId, folderId, includeAll } = req.query;
    const wikiIdValue = Array.isArray(wikiId) ? wikiId[0] : wikiId;
    const folderIdValue = Array.isArray(folderId) ? folderId[0] : folderId;
    const includeAllValue = Array.isArray(includeAll) ? includeAll[0] : includeAll;
    const resolvedWikiIdInput = typeof wikiIdValue === 'string' && wikiIdValue.trim()
      ? wikiIdValue.trim()
      : undefined;
    const resolvedFolderIdInput = typeof folderIdValue === 'string' && folderIdValue.trim()
      ? folderIdValue.trim()
      : undefined;
    const includeAllDocs =
      typeof includeAllValue === 'string' &&
      ['true', '1', 'yes'].includes(includeAllValue.trim().toLowerCase());
    const caller = getCallerOrganizationId(req);
    let resolvedWikiId: string | undefined = resolvedWikiIdInput;

    if (caller) {
      if (resolvedFolderIdInput && !resolvedWikiId) {
        const folder = await prisma.documentFolder.findUnique({
          where: { id: String(resolvedFolderIdInput) },
          select: { wikiId: true },
        });
        if (!folder) {
          res.status(404).json({ error: 'Document folder not found' });
          return;
        }
        resolvedWikiId = folder.wikiId;
      }
      if (!resolvedWikiId) {
        res.status(400).json({ error: 'wikiId or folderId query parameter is required' });
        return;
      }
      if (!(await ensureWikiInCallerOrg(resolvedWikiId, req, res))) return;
    }

    const where: Record<string, unknown> = {};
    if (resolvedWikiId) where.wikiId = resolvedWikiId;
    if (resolvedFolderIdInput) {
      where.folderId = resolvedFolderIdInput;
    } else if (resolvedWikiId && !includeAllDocs) {
      where.folderId = null;
    }
    const documents = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(documents);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
    }
}

export async function getDocumentByIdHandler(req: Request, res: Response) {
    try {
    if (!(await ensureDocumentInCallerOrg(req.params.id, req, res))) return;

    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document' });
    }
}

export async function updateDocumentHandler(req: Request, res: Response) {
    try {
    if (!(await ensureDocumentInCallerOrg(req.params.id, req, res))) return;

    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(document);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document' });
    }
}

export async function deleteDocumentHandler(req: Request, res: Response) {
    try {
    if (!(await ensureDocumentInCallerOrg(req.params.id, req, res))) return;

    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    await prisma.documentPermission.deleteMany({ where: { documentId: req.params.id } });
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document' });
    }
}
