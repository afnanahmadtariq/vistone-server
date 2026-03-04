import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createTeamMemberHandler(req: Request, res: Response) {
    try {
    const teamMember = await prisma.teamMember.create({
      data: req.body,
    });
    res.json(teamMember);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team member' });
    }
}

export async function getAllTeamMembersHandler(req: Request, res: Response) {
    try {
    const { userId, teamId } = req.query;
    const where: any = {};

    if (userId) where.userId = userId as string;
    if (teamId) where.teamId = teamId as string;

    const teamMembers = await prisma.teamMember.findMany({ where });
    res.json(teamMembers);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team members' });
    }
}

export async function getTeamMemberByIdHandler(req: Request, res: Response) {
    try {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
    });
    if (!teamMember) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    res.json(teamMember);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch team member' });
    }
}

export async function updateTeamMemberHandler(req: Request, res: Response) {
    try {
    const teamMember = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(teamMember);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update team member' });
    }
}

export async function deleteTeamMemberHandler(req: Request, res: Response) {
    try {
    await prisma.teamMember.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Team member deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete team member' });
    }
}
