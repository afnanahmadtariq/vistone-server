import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createUserAvailabilityHandler(req: Request, res: Response) {
    try {
    const userAvailability = await prisma.userAvailability.create({
      data: req.body,
    });
    res.json(userAvailability);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user availability' });
    }
}

export async function getAllUserAvailabilityHandler(req: Request, res: Response) {
    try {
    const userAvailability = await prisma.userAvailability.findMany();
    res.json(userAvailability);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user availability' });
    }
}

export async function getUserAvailabilityByIdHandler(req: Request, res: Response) {
    try {
    const userAvailability = await prisma.userAvailability.findUnique({
      where: { id: req.params.id },
    });
    if (!userAvailability) {
      res.status(404).json({ error: 'User availability not found' });
      return;
    }
    res.json(userAvailability);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user availability' });
    }
}

export async function updateUserAvailabilityHandler(req: Request, res: Response) {
    try {
    const userAvailability = await prisma.userAvailability.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(userAvailability);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user availability' });
    }
}

export async function deleteUserAvailabilityHandler(req: Request, res: Response) {
    try {
    await prisma.userAvailability.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'User availability deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user availability' });
    }
}
