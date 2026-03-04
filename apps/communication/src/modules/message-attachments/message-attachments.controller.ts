import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createMessageAttachmentHandler(req: Request, res: Response) {
    try {
    const messageAttachment = await prisma.messageAttachment.create({
      data: req.body,
    });
    res.json(messageAttachment);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create message attachment' });
    }
}

export async function getAllMessageAttachmentsHandler(req: Request, res: Response) {
    try {
    const messageAttachments = await prisma.messageAttachment.findMany();
    res.json(messageAttachments);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message attachments' });
    }
}

export async function getMessageAttachmentByIdHandler(req: Request, res: Response) {
    try {
    const messageAttachment = await prisma.messageAttachment.findUnique({
      where: { id: req.params.id },
    });
    if (!messageAttachment) {
      res.status(404).json({ error: 'Message attachment not found' });
      return;
    }
    res.json(messageAttachment);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch message attachment' });
    }
}
