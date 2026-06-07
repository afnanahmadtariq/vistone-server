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
    const email = req.query?.email;
    if (typeof email === "string" && email.trim() !== "") {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email.trim(), mode: "insensitive" } },
      });
      res.json(user ? [user] : []);
      return;
    }

    const organizationId = req.query?.organizationId;
    if (typeof organizationId === "string" && organizationId.trim() !== "") {
      const users = await prisma.user.findMany({
        where: {
          organizationMemberships: {
            some: { organizationId: organizationId.trim() },
          },
        },
      });
      res.json(users);
      return;
    }

    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
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
    const raw = req.body as Record<string, unknown>;
    const { avatar, ...rest } = raw;
    const data = { ...rest } as Record<string, unknown>;
    if (avatar !== undefined) {
      data.avatarUrl = avatar;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });
    res.json(user);
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update user' });
    }
}

export async function deleteUserHandler(req: Request, res: Response) {
    try {
    await prisma.$transaction(async (tx: {
      activityLog: {
        deleteMany: (args: { where: { userId: string } }) => Promise<unknown>;
      };
      user: {
        delete: (args: { where: { id: string } }) => Promise<unknown>;
      };
    }) => {
      await tx.activityLog.deleteMany({
        where: { userId: req.params.id },
      });

      await tx.user.delete({
        where: { id: req.params.id },
      });
    });
    res.json({ success: true, message: 'User deleted' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
    }
}
