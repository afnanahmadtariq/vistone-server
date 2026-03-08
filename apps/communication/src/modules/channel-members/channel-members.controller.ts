import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createChannelMemberHandler(req: Request, res: Response) {
    try {
    const channelMember = await prisma.channelMember.create({
      data: req.body,
    });
    res.json(channelMember);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create channel member' });
    }
}

export async function getAllChannelMembersHandler(req: Request, res: Response) {
    try {
    const { channelId, userId } = req.query;
    const where: Record<string, unknown> = {};
    if (channelId) where.channelId = channelId as string;
    if (userId) where.userId = userId as string;
    const channelMembers = await prisma.channelMember.findMany({ where });
    res.json(channelMembers);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel members' });
    }
}

export async function getChannelMemberByIdHandler(req: Request, res: Response) {
    try {
    const channelMember = await prisma.channelMember.findUnique({
      where: { id: req.params.id },
    });
    if (!channelMember) {
      res.status(404).json({ error: 'Channel member not found' });
      return;
    }
    res.json(channelMember);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch channel member' });
    }
}

export async function updateChannelMemberHandler(req: Request, res: Response) {
    try {
    const channelMember = await prisma.channelMember.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(channelMember);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update channel member' });
    }
}

export async function deleteChannelMemberHandler(req: Request, res: Response) {
    try {
    await prisma.channelMember.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Channel member deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete channel member' });
    }
}
