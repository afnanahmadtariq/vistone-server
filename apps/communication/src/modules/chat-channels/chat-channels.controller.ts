import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createChatChannelHandler(req: Request, res: Response) {
  try {
    const chatChannel = await prisma.chatChannel.create({
      data: req.body,
    });
    res.json(chatChannel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat channel' });
  }
}

export async function getAllChatChannelsHandler(req: Request, res: Response) {
  try {
    const { projectId, teamId, type } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId as string;
    if (teamId) where.teamId = teamId as string;
    if (type) where.type = type as string;
    const chatChannels = await prisma.chatChannel.findMany({
      where,
      include: {
        members: true,
        _count: { select: { messages: true } },
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
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { mentions: true, attachments: true },
        },
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
    const chatChannel = await prisma.chatChannel.update({
      where: { id: req.params.id },
      data: req.body,
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
