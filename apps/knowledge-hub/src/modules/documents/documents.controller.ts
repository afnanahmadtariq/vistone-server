import { Request, Response } from "express";
import type { RequestWithInternalUser } from "@vistone-server/shared-internal-auth";
import prisma from "../../lib/prisma";
import { ensureDocumentInCallerOrg, ensureWikiInCallerOrg, getCallerOrganizationId } from "../../lib/org-scope";

function metadataUploadedBy(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const u = (metadata as Record<string, unknown>).uploadedBy;
  return typeof u === "string" && u.trim() ? u.trim() : null;
}

/** Primary uploader: DB column, else legacy metadata.uploadedBy (e.g. chat sync). */
function resolveDocumentUploaderId(doc: {
  uploadedById: string | null;
  metadata: unknown;
}): string | null {
  if (doc.uploadedById && doc.uploadedById.trim()) return doc.uploadedById.trim();
  return metadataUploadedBy(doc.metadata);
}

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
    const { organizationId, uploadedById: _bodyUploader, ...documentData } = req.body;
    const uid = (req as RequestWithInternalUser).internalUser?.id?.trim() || null;
    const fromMeta = metadataUploadedBy(documentData.metadata);
    const uploadedById = uid ?? fromMeta ?? null;
    if (!uploadedById) {
      res.status(400).json({
        error: 'Could not determine uploader. Sign in or ensure metadata.uploadedBy is set for service-created documents.',
      });
      return;
    }
    const document = await prisma.document.create({
      data: { ...documentData, uploadedById },
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

export async function getDocumentVersionsHandler(req: Request, res: Response) {
    try {
    const docId = req.params.id;
    if (!(await ensureDocumentInCallerOrg(docId, req, res))) return;

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: docId },
      orderBy: { version: "desc" },
    });
    res.json(versions);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document versions' });
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

    const callerId = (req as RequestWithInternalUser).internalUser?.id?.trim() || null;
    if (getCallerOrganizationId(req) && !callerId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const ownerId = resolveDocumentUploaderId(existing);
    if (getCallerOrganizationId(req)) {
      if (!ownerId) {
        res.status(403).json({
          error: 'This document has no recorded uploader and cannot be updated. Upload a new file instead.',
        });
        return;
      }
      if (ownerId !== callerId) {
        res.status(403).json({ error: 'Only the user who uploaded this document can update it' });
        return;
      }
    }

    const body = req.body as Record<string, unknown>;
    const nextName = typeof body.name === 'string' ? body.name : existing.name;
    const nextUrl = typeof body.url === 'string' ? body.url : existing.url;
    const contentChanged = nextName !== existing.name || nextUrl !== existing.url;

    if (contentChanged) {
      const uid = (req as RequestWithInternalUser).internalUser?.id ?? null;
      await prisma.documentVersion.create({
        data: {
          documentId: existing.id,
          name: existing.name,
          url: existing.url,
          version: existing.version,
          uploadedById: uid,
        },
      });
    }

    const nextVersion = contentChanged ? existing.version + 1 : existing.version;
    const updateData: {
      name: string;
      url: string;
      version: number;
      folderId?: string | null;
      metadata?: unknown;
      uploadedById?: string;
    } = {
      name: nextName,
      url: nextUrl,
      version: typeof body.version === 'number' ? (body.version as number) : nextVersion,
    };
    if (body.folderId !== undefined) updateData.folderId = body.folderId as string | null;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (!existing.uploadedById?.trim() && ownerId) {
      updateData.uploadedById = ownerId;
    }

    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: updateData,
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

    const existing = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { wiki: { select: { metadata: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const meta = existing.wiki?.metadata as Record<string, unknown> | null | undefined;
    const internal = (req as RequestWithInternalUser).internalUser;
    if (meta?.clientOrganizerWorkspace === true && internal?.role?.toLowerCase() === 'client') {
      res.status(403).json({ error: 'Clients cannot delete documents in this shared workspace' });
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
