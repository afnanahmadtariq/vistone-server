import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createClientHandler(req: Request, res: Response) {
    try {
    const client = await prisma.client.create({
      data: req.body,
    });
    res.json(client);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create client' });
    }
}

export async function getAllClientsHandler(req: Request, res: Response) {
    try {
    const { organizationId } = req.query;
    const where: any = {};

    // Filter by organizationId if provided
    if (organizationId) {
      where.organizationId = organizationId as string;
    }

    const clients = await prisma.client.findMany({ where });
    res.json(clients);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch clients' });
    }
}

export async function getClientByIdHandler(req: Request, res: Response) {
    try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
    });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(client);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch client' });
    }
}

export async function updateClientHandler(req: Request, res: Response) {
    try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update client' });
    }
}

export async function deleteClientHandler(req: Request, res: Response) {
    try {
    await prisma.client.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Client deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete client' });
    }
}
