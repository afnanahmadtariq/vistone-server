import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createDocumentHandler(req: Request, res: Response) {
    try {
    const document = await prisma.document.create({
      data: req.body,
    });
    res.json(document);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create document' });
    }
}

export async function getAllDocumentsHandler(req: Request, res: Response) {
    try {
    const documents = await prisma.document.findMany();
    res.json(documents);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
    }
}

export async function getDocumentByIdHandler(req: Request, res: Response) {
    try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch document' });
    }
}

export async function updateDocumentHandler(req: Request, res: Response) {
    try {
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(document);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update document' });
    }
}

export async function deleteDocumentHandler(req: Request, res: Response) {
    try {
    await prisma.documentPermission.deleteMany({ where: { documentId: req.params.id } });
    await prisma.documentLink.deleteMany({ where: { documentId: req.params.id } });
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document' });
    }
}
