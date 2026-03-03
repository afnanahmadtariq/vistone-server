import { Request, Response } from "express";
import prisma from "../../lib/prisma";

export async function createUserSkillHandler(req: Request, res: Response) {
    try {
    const userSkill = await prisma.userSkill.create({
      data: req.body,
    });
    res.json(userSkill);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user skill' });
    }
}

export async function getAllUserSkillsHandler(req: Request, res: Response) {
    try {
    const { userId } = req.query;
    const where: any = {};

    if (userId) where.userId = userId as string;

    const userSkills = await prisma.userSkill.findMany({ where });
    res.json(userSkills);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user skills' });
    }
}

export async function getUserSkillByIdHandler(req: Request, res: Response) {
    try {
    const userSkill = await prisma.userSkill.findUnique({
      where: { id: req.params.id },
    });
    if (!userSkill) {
      res.status(404).json({ error: 'User skill not found' });
      return;
    }
    res.json(userSkill);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user skill' });
    }
}

export async function updateUserSkillHandler(req: Request, res: Response) {
    try {
    const userSkill = await prisma.userSkill.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(userSkill);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user skill' });
    }
}

export async function deleteUserSkillHandler(req: Request, res: Response) {
    try {
    await prisma.userSkill.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'User skill deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user skill' });
    }
}
