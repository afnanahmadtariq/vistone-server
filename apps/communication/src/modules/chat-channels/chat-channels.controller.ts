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
    const chatChannels = await prisma.chatChannel.findMany();
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
