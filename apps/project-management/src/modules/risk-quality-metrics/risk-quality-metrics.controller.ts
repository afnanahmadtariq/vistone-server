import { Request, Response } from "express";
import prisma from "../../lib/prisma";
import {
  computeRiskQualityMetrics,
  metricsToComputedObject,
} from "../../lib/risk-quality-formulas";

const RESOLVED = new Set(["resolved", "closed", "mitigated", "done", "complete", "completed"]);

async function burndownCounts(projectId: string): Promise<{ resolvedRiskCount: number; totalRiskCount: number }> {
  const statusRows = await prisma.riskRegister.findMany({
    where: { projectId },
    select: { status: true },
  });
  const totalRiskCount = statusRows.length;
  const resolvedRiskCount = statusRows.filter((r: { status: string | null }) =>
    RESOLVED.has(String(r.status || "").toLowerCase())
  ).length;
  return { resolvedRiskCount, totalRiskCount };
}

export async function getRiskQualityMetricsHandler(req: Request, res: Response) {
  try {
    const projectId = req.params.projectId;
    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const burndown = await burndownCounts(projectId);
    const row = await prisma.projectRiskQualityMetrics.findUnique({
      where: { projectId },
    });
    const inputs = (row?.inputs as Record<string, unknown>) || {};
    const metricRows = computeRiskQualityMetrics(inputs, burndown);
    const computed = metricsToComputedObject(metricRows);

    res.json({
      id: row?.id ?? null,
      projectId,
      inputs,
      computed,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch risk quality metrics" });
  }
}

export async function upsertRiskQualityMetricsHandler(req: Request, res: Response) {
  try {
    const projectId = req.params.projectId;
    const patch = (req.body as { inputs?: Record<string, unknown> }).inputs;

    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const existing = await prisma.projectRiskQualityMetrics.findUnique({
      where: { projectId },
    });
    const prev = (existing?.inputs as Record<string, unknown>) || {};
    const merged = { ...prev, ...(patch || {}) };

    const burndown = await burndownCounts(projectId);
    const metricRows = computeRiskQualityMetrics(merged, burndown);
    const computed = metricsToComputedObject(metricRows);

    const saved = await prisma.projectRiskQualityMetrics.upsert({
      where: { projectId },
      create: {
        projectId,
        inputs: merged,
        computed,
      },
      update: {
        inputs: merged,
        computed,
      },
    });

    res.json({
      id: saved.id,
      projectId: saved.projectId,
      inputs: saved.inputs,
      computed: saved.computed,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save risk quality metrics" });
  }
}
