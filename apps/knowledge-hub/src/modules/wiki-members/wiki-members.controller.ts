import type { Request, Response } from 'express';
import type { RequestWithInternalUser } from '@vistone-server/shared-internal-auth';
import prisma from '../../lib/prisma';
import { ensureWikiInCallerOrg } from '../../lib/org-scope';

export async function createWikiMemberHandler(req: Request, res: Response): Promise<void> {
  try {
    const wikiId = typeof req.body?.wikiId === 'string' ? req.body.wikiId.trim() : '';
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    const role =
      typeof req.body?.role === 'string' && req.body.role.trim()
        ? req.body.role.trim()
        : 'member';

    if (!wikiId || !userId) {
      res.status(400).json({ error: 'wikiId and userId are required' });
      return;
    }
    if (!(await ensureWikiInCallerOrg(wikiId, req, res))) return;

    const member = await prisma.wikiMember.create({
      data: { wikiId, userId, role },
    });
    res.status(201).json(member);
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : '';
    if (code === 'P2002') {
      res.status(400).json({ error: 'User is already a member of this wiki' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki member' });
  }
}

export async function getWikiMembersHandler(req: Request, res: Response): Promise<void> {
  try {
    const wikiId = req.query.wikiId ? String(req.query.wikiId) : '';
    const userId = req.query.userId ? String(req.query.userId) : '';

    if (!wikiId && !userId) {
      res.status(400).json({ error: 'Provide wikiId and/or userId' });
      return;
    }

    if (userId && !wikiId) {
      const caller = (req as RequestWithInternalUser).internalUser;
      if (caller && String(userId) !== caller.id) {
        res.status(403).json({ error: 'Can only list your own wiki memberships' });
        return;
      }
      const members = await prisma.wikiMember.findMany({
        where: { userId },
      });
      res.json(members);
      return;
    }

    if (wikiId) {
      if (!(await ensureWikiInCallerOrg(wikiId, req, res))) return;
      const where: { wikiId: string; userId?: string } = { wikiId };
      if (userId) where.userId = userId;
      const members = await prisma.wikiMember.findMany({ where });
      res.json(members);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki members' });
  }
}

export async function getWikiMemberByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const member = await prisma.wikiMember.findUnique({
      where: { id: req.params.id },
    });
    if (!member) {
      res.status(404).json({ error: 'Wiki member not found' });
      return;
    }
    if (!(await ensureWikiInCallerOrg(member.wikiId, req, res))) return;
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki member' });
  }
}

export async function deleteWikiMemberHandler(req: Request, res: Response): Promise<void> {
  try {
    const existing = await prisma.wikiMember.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Wiki member not found' });
      return;
    }
    if (!(await ensureWikiInCallerOrg(existing.wikiId, req, res))) return;

    await prisma.wikiMember.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Wiki member removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete wiki member' });
  }
}
