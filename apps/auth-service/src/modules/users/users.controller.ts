import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createUserHandler(req: Request, res: Response) {
    try {
    const user = await prisma.user.create({
      data: req.body,
    });
    res.json(user);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
    }
}

export async function getAllUsersHandler(req: Request, res: Response) {
    try {
    const users = await prisma.user.findMany();
    res.json(users);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
    }
}

export async function getUserByIdHandler(req: Request, res: Response) {
    try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
    }
}

export async function updateUserHandler(req: Request, res: Response) {
    try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(user);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
    }
}

export async function deleteUserHandler(req: Request, res: Response) {
    try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'User deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
    }
}
