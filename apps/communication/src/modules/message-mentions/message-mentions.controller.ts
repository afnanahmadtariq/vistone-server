import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createMessageMentionHandler(req: Request, res: Response) {
    try {
    const messageMention = await prisma.messageMention.create({
      data: req.body,
    });
    res.json(messageMention);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create message mention' });
    }
}

export async function getAllMessageMentionsHandler(req: Request, res: Response) {
    try {
    const messageMentions = await prisma.messageMention.findMany();
    res.json(messageMentions);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message mentions' });
    }
}

export async function getMessageMentionByIdHandler(req: Request, res: Response) {
    try {
    const messageMention = await prisma.messageMention.findUnique({
      where: { id: req.params.id },
    });
    if (!messageMention) {
      res.status(404).json({ error: 'Message mention not found' });
      return;
    }
    res.json(messageMention);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message mention' });
    }
}
