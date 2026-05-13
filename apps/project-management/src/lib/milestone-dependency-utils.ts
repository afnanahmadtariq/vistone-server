import prisma from "./prisma";

/** Edge: `successor` depends on `predecessor` (predecessor must complete first). */
export type MilestoneDepEdge = { milestoneId: string; dependsOnId: string };

const LINK_TYPES = new Set(["FS", "SS", "FF", "SF"]);

export function normalizeMilestoneDepType(raw: unknown): string {
  const t = String(raw ?? "FS")
    .trim()
    .toUpperCase();
  if (LINK_TYPES.has(t)) return t;
  return "FS";
}

/**
 * Returns true if adding `successorId` depends on `predecessorId` would create a cycle,
 * using `existingEdges` excluding outgoing edges from `successorId`.
 */
export function wouldMilestoneDependencyCreateCycle(
  successorId: string,
  predecessorId: string,
  existingEdges: MilestoneDepEdge[],
): boolean {
  if (successorId === predecessorId) return true;

  const dependentsOf = new Map<string, string[]>();
  for (const e of existingEdges) {
    if (e.milestoneId === successorId) continue;
    const list = dependentsOf.get(e.dependsOnId);
    if (list) list.push(e.milestoneId);
    else dependentsOf.set(e.dependsOnId, [e.milestoneId]);
  }

  const stack = [successorId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === predecessorId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const n of dependentsOf.get(cur) ?? []) stack.push(n);
  }
  return false;
}

export function milestoneDependencyGraphIsAcyclic(edges: MilestoneDepEdge[]): boolean {
  const nodes = new Set<string>();
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const e of edges) {
    nodes.add(e.milestoneId);
    nodes.add(e.dependsOnId);
    if (!adj.has(e.dependsOnId)) adj.set(e.dependsOnId, []);
    adj.get(e.dependsOnId)!.push(e.milestoneId);
    indeg.set(e.milestoneId, (indeg.get(e.milestoneId) ?? 0) + 1);
    indeg.set(e.dependsOnId, indeg.get(e.dependsOnId) ?? 0);
  }
  const q: string[] = [];
  for (const id of nodes) {
    if ((indeg.get(id) ?? 0) === 0) q.push(id);
  }
  let seen = 0;
  while (q.length) {
    const u = q.shift()!;
    seen++;
    for (const v of adj.get(u) ?? []) {
      const next = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, next);
      if (next === 0) q.push(v);
    }
  }
  return seen === nodes.size;
}

export async function loadAllMilestoneDependencyEdgesForProject(
  projectId: string,
): Promise<MilestoneDepEdge[]> {
  const milestones = (await prisma.milestone.findMany({
    where: { projectId },
    select: { id: true },
  })) as { id: string }[];
  const ids = milestones.map((m) => m.id);
  if (ids.length === 0) return [];
  const rows = await prisma.milestoneDependency.findMany({
    where: { milestoneId: { in: ids } },
    select: { milestoneId: true, dependsOnId: true },
  });
  return rows;
}

export async function assertMilestonePrerequisitesMetForCompletion(
  milestoneId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const deps = (await prisma.milestoneDependency.findMany({
    where: { milestoneId },
    include: {
      dependsOn: { select: { id: true, title: true, completed: true } },
    },
  })) as Array<{
    dependsOn: { id: string; title: string; completed: boolean };
  }>;
  const blocked = deps.filter((d) => !d.dependsOn.completed);
  if (blocked.length === 0) return { ok: true };
  const titles = blocked.map((d) => d.dependsOn.title).join(", ");
  return {
    ok: false,
    message: `Complete prerequisite milestones first: ${titles}`,
  };
}
