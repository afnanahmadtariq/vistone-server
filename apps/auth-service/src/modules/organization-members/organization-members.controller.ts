import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import { memberKindFromRoleName, type OrganizationMemberKindValue } from "../../lib/org-member-kind";

export async function createOrganizationMemberHandler(req: Request, res: Response) {
    try {
    const { organizationId, userId, roleId, memberKind: memberKindBody } = req.body as {
      organizationId?: string;
      userId?: string;
      roleId?: string | null;
      memberKind?: string;
    };

    if (!organizationId || !userId) {
      res.status(400).json({ error: 'organizationId and userId are required' });
      return;
    }

    const existingSameOrg = await prisma.organizationMember.findFirst({
      where: { organizationId, userId },
    });

    if (existingSameOrg) {
      res.status(409).json({
        error:
          'This user is already a member of this organization.',
      });
      return;
    }

    const existingOtherOrg = await prisma.organizationMember.findUnique({
      where: { userId },
    });

    if (existingOtherOrg) {
      res.status(409).json({
        error:
          'This user is already a member of another organization. Each user may belong to only one organization.',
      });
      return;
    }

    let resolvedKind: OrganizationMemberKindValue | undefined = memberKindBody as
      | OrganizationMemberKindValue
      | undefined;
    if (!resolvedKind && roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      resolvedKind = memberKindFromRoleName(role?.name);
    }
    if (!resolvedKind) {
      resolvedKind = memberKindFromRoleName(null);
    }

    if (resolvedKind === 'ORGANIZER') {
      const organizerTaken = await prisma.organizationMember.findFirst({
        where: { organizationId, memberKind: 'ORGANIZER' },
      });
      if (organizerTaken) {
        res.status(409).json({
          error: 'This organization already has an organizer.',
        });
        return;
      }
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        roleId: roleId ?? null,
        memberKind: resolvedKind,
      },
    });
    res.json(member);
    } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({
        error: 'Organization membership constraint violated (duplicate user or organizer slot).',
      });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization member' });
    }
}

export async function getAllOrganizationMembersHandler(req: Request, res: Response) {
    try {
    const { organizationId, userId } = req.query;
    const where: Record<string, unknown> = {};

    // Filter by organizationId if provided
    if (organizationId) {
      where.organizationId = organizationId as string;
    }

    // Filter by userId if provided
    if (userId) {
      where.userId = userId as string;
    }

    const members = await prisma.organizationMember.findMany({
      where,
      include: {
        role: { select: { id: true, name: true } },
      },
    });
    res.json(members);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization members' });
    }
}

export async function getOrganizationMemberByIdHandler(req: Request, res: Response) {
    try {
    const member = await prisma.organizationMember.findUnique({
      where: { id: req.params.id },
    });
    if (!member) {
      res.status(404).json({ error: 'Organization member not found' });
      return;
    }
    res.json(member);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization member' });
    }
}

export async function updateOrganizationMemberHandler(req: Request, res: Response) {
    try {
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { ...body };

    if (data.roleId !== undefined) {
      const nextRoleId = data.roleId as string | null;
      if (nextRoleId) {
        const role = await prisma.role.findUnique({ where: { id: nextRoleId } });
        data.memberKind = memberKindFromRoleName(role?.name);
      } else {
        data.memberKind = 'CONTRIBUTOR';
      }
    }

    if (data.memberKind === 'ORGANIZER') {
      const current = await prisma.organizationMember.findUnique({
        where: { id: req.params.id },
      });
      if (current) {
        const other = await prisma.organizationMember.findFirst({
          where: {
            organizationId: current.organizationId,
            memberKind: 'ORGANIZER',
            NOT: { id: current.id },
          },
        });
        if (other) {
          res.status(409).json({ error: 'This organization already has an organizer.' });
          return;
        }
      }
    }

    const member = await prisma.organizationMember.update({
      where: { id: req.params.id },
      data,
    });
    res.json(member);
    } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({ error: 'Update would violate organization membership constraints.' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update organization member' });
    }
}

export async function deleteOrganizationMemberHandler(req: Request, res: Response) {
    try {
    await prisma.organizationMember.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Organization member deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete organization member' });
    }
}
