import type { Request, Response } from 'express';
import type { RequestWithInternalUser } from '@vistone-server/shared-internal-auth';
import prisma from './prisma';

/**
 * Organization ID from JWT (`internalUser`) when auth middleware ran.
 * When `SKIP_INTERNAL_SERVICE_AUTH=true` or health checks skip auth, this is null and tenant checks are skipped (dev/local only).
 */
export function getCallerOrganizationId(req: Request): string | null {
  const u = (req as RequestWithInternalUser).internalUser;
  return u?.organizationId ?? null;
}

/** List/query endpoints: requested org (query param or body) must match the caller's org. */
export function ensureQueryOrgMatchesCaller(req: Request, requestedOrgId: string, res: Response): boolean {
  const caller = getCallerOrganizationId(req);
  if (!caller) return true;
  if (String(requestedOrgId) !== caller) {
    res.status(403).json({ error: 'Access denied: organization scope mismatch' });
    return false;
  }
  return true;
}

export async function ensureWikiInCallerOrg(wikiId: string, req: Request, res: Response): Promise<boolean> {
  const caller = getCallerOrganizationId(req);
  if (!caller) return true;
  const wiki = await prisma.wiki.findUnique({
    where: { id: wikiId },
    select: { organizationId: true },
  });
  if (!wiki) {
    res.status(404).json({ error: 'Wiki not found' });
    return false;
  }
  if (wiki.organizationId !== caller) {
    res.status(403).json({ error: 'Access denied: resource is not in your organization' });
    return false;
  }
  return true;
}

export async function ensureWikiPageInCallerOrg(wikiPageId: string, req: Request, res: Response): Promise<boolean> {
  const caller = getCallerOrganizationId(req);
  if (!caller) return true;
  const page = await prisma.wikiPage.findUnique({
    where: { id: wikiPageId },
    select: { wikiId: true },
  });
  if (!page) {
    res.status(404).json({ error: 'Wiki page not found' });
    return false;
  }
  return ensureWikiInCallerOrg(page.wikiId, req, res);
}

export async function ensureDocumentInCallerOrg(documentId: string, req: Request, res: Response): Promise<boolean> {
  const caller = getCallerOrganizationId(req);
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { wikiId: true },
  });
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return false;
  }
  if (!caller) return true;
  return ensureWikiInCallerOrg(doc.wikiId, req, res);
}

export async function ensureDocumentFolderInCallerOrg(folderId: string, req: Request, res: Response): Promise<boolean> {
  const caller = getCallerOrganizationId(req);
  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    select: { wikiId: true },
  });
  if (!folder) {
    res.status(404).json({ error: 'Document folder not found' });
    return false;
  }
  if (!caller) return true;
  return ensureWikiInCallerOrg(folder.wikiId, req, res);
}
