import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createOrganizationMemberHandler(req: Request, res: Response) {
    try {
    const member = await prisma.organizationMember.create({
      data: req.body,
    });
    res.json(member);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization member' });
    }
}

export async function getAllOrganizationMembersHandler(req: Request, res: Response) {
    try {
    const { organizationId, userId } = req.query;
    const where: any = {};

    // Filter by organizationId if provided
    if (organizationId) {
      where.organizationId = organizationId as string;
    }

    // Filter by userId if provided
    if (userId) {
      where.userId = userId as string;
    }

    const members = await prisma.organizationMember.findMany({ where });
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
    const member = await prisma.organizationMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(member);
    } catch (error) {
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
