import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import type { Prisma } from "../../lib/prisma-namespace";
import {
  loadAllMilestoneDependencyEdgesForProject,
  normalizeMilestoneDepType,
  wouldMilestoneDependencyCreateCycle,
  milestoneDependencyGraphIsAcyclic,
  type MilestoneDepEdge,
} from "../../lib/milestone-dependency-utils";

export async function getAllMilestoneDependenciesHandler(req: Request, res: Response) {
  try {
    const { milestoneId, projectId } = req.query;
    const where: Record<string, unknown> = {};

    if (typeof milestoneId === "string" && milestoneId.length > 0) {
      where.milestoneId = milestoneId;
    } else if (typeof projectId === "string" && projectId.length > 0) {
      const milestones = (await prisma.milestone.findMany({
        where: { projectId },
        select: { id: true },
      })) as { id: string }[];
      const ids = milestones.map((m) => m.id);
      if (ids.length === 0) {
        res.json([]);
        return;
      }
      where.milestoneId = { in: ids };
    }

    const rows = await prisma.milestoneDependency.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        dependsOn: { select: { id: true, title: true, completed: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch milestone dependencies" });
  }
}

export async function createMilestoneDependencyHandler(req: Request, res: Response) {
  try {
    const { milestoneId, dependsOnId, type } = req.body as {
      milestoneId: string;
      dependsOnId: string;
      type?: string;
    };
    if (!milestoneId || !dependsOnId) {
      res.status(400).json({ error: "milestoneId and dependsOnId are required" });
      return;
    }
    if (milestoneId === dependsOnId) {
      res.status(400).json({ error: "A milestone cannot depend on itself" });
      return;
    }

    const [succ, pred] = await Promise.all([
      prisma.milestone.findUnique({ where: { id: milestoneId }, select: { projectId: true } }),
      prisma.milestone.findUnique({ where: { id: dependsOnId }, select: { projectId: true } }),
    ]);
    if (!succ || !pred) {
      res.status(400).json({ error: "Milestone not found" });
      return;
    }
    if (succ.projectId !== pred.projectId) {
      res.status(400).json({ error: "Milestones must belong to the same project" });
      return;
    }

    const dup = await prisma.milestoneDependency.findFirst({
      where: { milestoneId, dependsOnId },
    });
    if (dup) {
      res.status(400).json({ error: "This milestone dependency already exists" });
      return;
    }

    const existing = await loadAllMilestoneDependencyEdgesForProject(succ.projectId);
    if (wouldMilestoneDependencyCreateCycle(milestoneId, dependsOnId, existing)) {
      res.status(400).json({ error: "This dependency would create a cycle between milestones" });
      return;
    }

    const normalized = normalizeMilestoneDepType(type);
    const row = await prisma.milestoneDependency.create({
      data: { milestoneId, dependsOnId, type: normalized },
    });
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create milestone dependency" });
  }
}

export async function replaceMilestoneDependenciesHandler(req: Request, res: Response) {
  try {
    const { milestoneId, dependsOnIds } = req.body as {
      milestoneId: string;
      dependsOnIds: string[];
    };
    if (!milestoneId || !Array.isArray(dependsOnIds)) {
      res.status(400).json({ error: "milestoneId and dependsOnIds array are required" });
      return;
    }

    const self = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      select: { id: true, projectId: true },
    });
    if (!self) {
      res.status(404).json({ error: "Milestone not found" });
      return;
    }

    const unique = [...new Set(dependsOnIds)];
    if (unique.some((id) => id === milestoneId)) {
      res.status(400).json({ error: "A milestone cannot depend on itself" });
      return;
    }

    if (unique.length > 0) {
      const preds = await prisma.milestone.findMany({
        where: { id: { in: unique }, projectId: self.projectId },
        select: { id: true },
      });
      if (preds.length !== unique.length) {
        res.status(400).json({ error: "All prerequisite milestones must belong to this project" });
        return;
      }
    }

    const allExisting = await loadAllMilestoneDependencyEdgesForProject(self.projectId);
    const withoutOutgoing = allExisting.filter((e) => e.milestoneId !== milestoneId);
    const proposed: MilestoneDepEdge[] = [
      ...withoutOutgoing,
      ...unique.map((dependsOnId) => ({ milestoneId, dependsOnId })),
    ];
    if (!milestoneDependencyGraphIsAcyclic(proposed)) {
      res.status(400).json({ error: "Milestone dependencies would contain a cycle" });
      return;
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.milestoneDependency.deleteMany({ where: { milestoneId } });
      for (const dependsOnId of unique) {
        await tx.milestoneDependency.create({
          data: { milestoneId, dependsOnId, type: "FS" },
        });
      }
    });

    const next = await prisma.milestoneDependency.findMany({
      where: { milestoneId },
      include: {
        dependsOn: { select: { id: true, title: true, completed: true, status: true } },
      },
    });
    res.json(next);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to replace milestone dependencies" });
  }
}

export async function deleteMilestoneDependencyHandler(req: Request, res: Response) {
  try {
    await prisma.milestoneDependency.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: "Milestone dependency deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete milestone dependency" });
  }
}
