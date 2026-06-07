import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { ensureDocumentInCallerOrg } from "../../lib/org-scope";

export async function createDocumentPermissionHandler(req: Request, res: Response) {
    try {
    const documentId = req.body?.documentId;
    if (typeof documentId !== 'string' || !documentId.trim()) {
      res.status(400).json({ error: 'documentId is required' });
      return;
    }
    if (!(await ensureDocumentInCallerOrg(documentId.trim(), req, res))) return;

    const documentPermission = await prisma.documentPermission.create({
      data: req.body,
    });
    res.json(documentPermission);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document permission' });
    }
}

export async function getAllDocumentPermissionsHandler(req: Request, res: Response) {
    try {
    const documentId = req.query.documentId;
    if (typeof documentId !== 'string' || !documentId.trim()) {
      res.status(400).json({ error: 'documentId query parameter is required' });
      return;
    }
    if (!(await ensureDocumentInCallerOrg(documentId.trim(), req, res))) return;

    const documentPermissions = await prisma.documentPermission.findMany({
      where: { documentId: documentId.trim() },
    });
    res.json(documentPermissions);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document permissions' });
    }
}

export async function getDocumentPermissionByIdHandler(req: Request, res: Response) {
    try {
    const documentPermission = await prisma.documentPermission.findUnique({
      where: { id: req.params.id },
    });
    if (!documentPermission) {
      res.status(404).json({ error: 'Document permission not found' });
      return;
    }
    if (!(await ensureDocumentInCallerOrg(documentPermission.documentId, req, res))) return;

    res.json(documentPermission);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document permission' });
    }
}

export async function updateDocumentPermissionHandler(req: Request, res: Response) {
    try {
    const existing = await prisma.documentPermission.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Document permission not found' });
      return;
    }
    if (!(await ensureDocumentInCallerOrg(existing.documentId, req, res))) return;

    const documentPermission = await prisma.documentPermission.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(documentPermission);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document permission' });
    }
}

export async function deleteDocumentPermissionHandler(req: Request, res: Response) {
    try {
    const existing = await prisma.documentPermission.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Document permission not found' });
      return;
    }
    if (!(await ensureDocumentInCallerOrg(existing.documentId, req, res))) return;

    await prisma.documentPermission.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Document permission deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document permission' });
    }
}
