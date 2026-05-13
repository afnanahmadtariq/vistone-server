import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-namespace";
import { assertMilestonePrerequisitesMetForCompletion } from "../../lib/milestone-dependency-utils";
import {
  calendarSlipDays,
  shiftDependentMilestoneDueDates,
} from "../../lib/milestone-schedule-cascade";

export async function createMilestoneHandler(req: Request, res: Response) {
  try {
    const { name, title, description, dueDate, status, projectId, completed, completedAt } = req.body;

    // Map 'name' to 'title' if 'title' is not provided (backwards compatibility)
    const milestoneTitle = title || name;

    if (!milestoneTitle) {
      res.status(400).json({ error: 'Title or name is required for milestone' });
      return;
    }

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        title: milestoneTitle,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status || 'NOT_STARTED',
        completed: completed || false,
        completedAt: completedAt ? new Date(completedAt) : undefined,
      },
    });
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
}

export async function getAllMilestonesHandler(req: Request, res: Response) {
  try {
    const { projectId, status } = req.query;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId as string;
    if (status) where.status = status as string;
    const milestones = await prisma.milestone.findMany({ where, orderBy: { dueDate: 'asc' } });
    res.json(milestones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
}

export async function getMilestoneByIdHandler(req: Request, res: Response) {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: req.params.id },
    });
    if (!milestone) {
      res.status(404).json({ error: 'Milestone not found' });
      return;
    }
    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch milestone' });
  }
}

export async function updateMilestoneHandler(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const prev = await prisma.milestone.findUnique({ where: { id } });
    if (!prev) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const data: Record<string, unknown> = { ...req.body };
    const skipScheduleCascade = data.skipScheduleCascade === true;
    delete data.skipScheduleCascade;

    if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
    // Auto-set completedAt when marking as completed
    if (data.completed === true && !data.completedAt) {
      data.completedAt = new Date();
    }
    if (data.completedAt) data.completedAt = new Date(data.completedAt as string);

    const completing =
      data.completed === true ||
      String(data.status ?? "").toUpperCase() === "COMPLETED";
    const prevCompleted =
      prev.completed === true || String(prev.status ?? "").toUpperCase() === "COMPLETED";
    const becameCompleted = completing && !prevCompleted;

    if (completing) {
      const gate = await assertMilestonePrerequisitesMetForCompletion(id);
      if (!gate.ok) {
        res.status(400).json({ error: gate.message });
        return;
      }
    }

    delete data.dependsOnIds;

    const milestone = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.milestone.update({
        where: { id },
        data,
      });

      if (becameCompleted && !skipScheduleCascade && prev.dueDate) {
        const completedAt = updated.completedAt ?? new Date();
        const slip = calendarSlipDays(prev.dueDate, completedAt);
        await shiftDependentMilestoneDueDates(tx, id, slip);
      }

      return updated;
    });

    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update milestone" });
  }
}

export async function deleteMilestoneHandler(req: Request, res: Response) {
  try {
    await prisma.milestone.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
}
