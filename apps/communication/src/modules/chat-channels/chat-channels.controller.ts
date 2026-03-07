import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createChatChannelHandler(req: Request, res: Response) {
  try {
    const { organizationId, name, description, type, projectId, createdBy, memberIds = [] } = req.body;

    if (!organizationId || !type || !createdBy) {
      res.status(400).json({ error: 'organizationId, type, and createdBy are required' });
      return;
    }

    // For DMs, exactly 2 members
    if (type === 'dm') {
      if (!memberIds || memberIds.length !== 2) {
        res.status(400).json({ error: 'DM channels require exactly 2 member IDs' });
        return;
      }
      // Check if DM already exists between these 2 users in this org
      const sortedIds = [...memberIds].sort();
      const existing = await prisma.chatChannel.findFirst({
        where: {
          organizationId,
          type: 'dm',
          members: {
            every: { userId: { in: sortedIds } },
          },
        },
        include: { members: true },
      });
      // Only reuse if it has exactly 2 members matching
      if (existing && existing.members.length === 2) {
        res.json(existing);
        return;
      }
    }

    const chatChannel = await prisma.chatChannel.create({
      data: {
        organizationId,
        name: type === 'dm' ? null : (name || 'Untitled Channel'),
        description,
        type,
        projectId: type === 'project' ? projectId : null,
        createdBy,
        members: {
          create: (memberIds as string[]).map((userId: string) => ({
            userId,
            role: userId === createdBy ? 'admin' : 'member',
          })),
        },
      },
      include: { members: true },
    });
    res.status(201).json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat channel' });
  }
}

export async function getAllChatChannelsHandler(req: Request, res: Response) {
  try {
    const { organizationId, projectId, type, userId } = req.query;
    const where: Record<string, unknown> = {};

    if (organizationId) where.organizationId = organizationId as string;
    if (projectId) where.projectId = projectId as string;
    if (type) where.type = type as string;
    if (userId) {
      where.members = { some: { userId: userId as string } };
    }
    where.isArchived = false;

    const chatChannels = await prisma.chatChannel.findMany({
      where,
      include: {
        members: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(chatChannels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat channels' });
  }
}

export async function getChatChannelByIdHandler(req: Request, res: Response) {
  try {
    const chatChannel = await prisma.chatChannel.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
      },
    });
    if (!chatChannel) {
      res.status(404).json({ error: 'Chat channel not found' });
      return;
    }
    res.json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat channel' });
  }
}

export async function updateChatChannelHandler(req: Request, res: Response) {
  try {
    const { name, description, isArchived } = req.body;
    const chatChannel = await prisma.chatChannel.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isArchived !== undefined && { isArchived }),
      },
    });
    res.json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update chat channel' });
  }
}

export async function deleteChatChannelHandler(req: Request, res: Response) {
  try {
    await prisma.chatChannel.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Chat channel deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete chat channel' });
  }
}

