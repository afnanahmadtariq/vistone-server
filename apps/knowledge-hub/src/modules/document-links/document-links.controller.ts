import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createDocumentLinkHandler(req: Request, res: Response) {
    try {
    const documentLink = await prisma.documentLink.create({
      data: req.body,
    });
    res.json(documentLink);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document link' });
    }
}

export async function getAllDocumentLinksHandler(req: Request, res: Response) {
    try {
    const documentLinks = await prisma.documentLink.findMany();
    res.json(documentLinks);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document links' });
    }
}

export async function getDocumentLinkByIdHandler(req: Request, res: Response) {
    try {
    const documentLink = await prisma.documentLink.findUnique({
      where: { id: req.params.id },
    });
    if (!documentLink) {
      res.status(404).json({ error: 'Document link not found' });
      return;
    }
    res.json(documentLink);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document link' });
    }
}

export async function updateDocumentLinkHandler(req: Request, res: Response) {
    try {
    const documentLink = await prisma.documentLink.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(documentLink);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document link' });
    }
}

export async function deleteDocumentLinkHandler(req: Request, res: Response) {
    try {
    await prisma.documentLink.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Document link deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document link' });
    }
}
