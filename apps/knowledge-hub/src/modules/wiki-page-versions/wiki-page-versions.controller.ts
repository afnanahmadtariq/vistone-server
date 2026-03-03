import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createWikiPageVersionHandler(req: Request, res: Response) {
    try {
    const wikiPageVersion = await prisma.wikiPageVersion.create({
      data: req.body,
    });
    res.json(wikiPageVersion);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create wiki page version' });
    }
}

export async function getAllWikiPageVersionsHandler(req: Request, res: Response) {
    try {
    const wikiPageVersions = await prisma.wikiPageVersion.findMany();
    res.json(wikiPageVersions);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page versions' });
    }
}

export async function getWikiPageVersionByIdHandler(req: Request, res: Response) {
    try {
    const wikiPageVersion = await prisma.wikiPageVersion.findUnique({
      where: { id: req.params.id },
    });
    if (!wikiPageVersion) {
      res.status(404).json({ error: 'Wiki page version not found' });
      return;
    }
    res.json(wikiPageVersion);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch wiki page version' });
    }
}
