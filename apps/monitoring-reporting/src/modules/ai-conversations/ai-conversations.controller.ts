import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createAiConversationHandler(req: Request, res: Response) {
    try {
    const aiConversation = await prisma.aiConversation.create({
      data: req.body,
    });
    res.json(aiConversation);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create AI conversation' });
    }
}

export async function getAllAiConversationsHandler(req: Request, res: Response) {
    try {
    const aiConversations = await prisma.aiConversation.findMany();
    res.json(aiConversations);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI conversations' });
    }
}

export async function getAiConversationByIdHandler(req: Request, res: Response) {
    try {
    const aiConversation = await prisma.aiConversation.findUnique({
      where: { id: req.params.id },
    });
    if (!aiConversation) {
      res.status(404).json({ error: 'AI conversation not found' });
      return;
    }
    res.json(aiConversation);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch AI conversation' });
    }
}

export async function updateAiConversationHandler(req: Request, res: Response) {
    try {
    const aiConversation = await prisma.aiConversation.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(aiConversation);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update AI conversation' });
    }
}

export async function deleteAiConversationHandler(req: Request, res: Response) {
    try {
    await prisma.aiConversation.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'AI conversation deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete AI conversation' });
    }
}
