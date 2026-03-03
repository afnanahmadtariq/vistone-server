import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createChatMessageHandler(req: Request, res: Response) {
    try {
    const chatMessage = await prisma.chatMessage.create({
      data: req.body,
    });
    res.json(chatMessage);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat message' });
    }
}

export async function getAllChatMessagesHandler(req: Request, res: Response) {
    try {
    const chatMessages = await prisma.chatMessage.findMany();
    res.json(chatMessages);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
}

export async function getChatMessageByIdHandler(req: Request, res: Response) {
    try {
    const chatMessage = await prisma.chatMessage.findUnique({
      where: { id: req.params.id },
    });
    if (!chatMessage) {
      res.status(404).json({ error: 'Chat message not found' });
      return;
    }
    res.json(chatMessage);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat message' });
    }
}

export async function updateChatMessageHandler(req: Request, res: Response) {
    try {
    const chatMessage = await prisma.chatMessage.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(chatMessage);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update chat message' });
    }
}

export async function deleteChatMessageHandler(req: Request, res: Response) {
    try {
    await prisma.chatMessage.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Chat message deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete chat message' });
    }
}
