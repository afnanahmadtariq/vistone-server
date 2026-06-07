import type { Prisma } from "./prisma-namespace";

const LINK_TYPES = new Set(["FS", "SS", "FF", "SF"]);

function normalizeMilestoneDepType(raw: unknown): string {
  const t = String(raw ?? "FS")
    .trim()
    .toUpperCase();
  if (LINK_TYPES.has(t)) return t;
  return "FS";
}

/** Start of local calendar day for the given instant. */
export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Calendar slip of actual vs planned end: positive when actual is after planned (late).
 * Uses local date boundaries. If planned is null, returns 0 (no baseline to compare).
 */
export function calendarSlipDays(plannedEnd: Date | null, actualEnd: Date): number {
  if (!plannedEnd) return 0;
  const p = startOfLocalDay(plannedEnd).getTime();
  const a = startOfLocalDay(actualEnd).getTime();
  return Math.round((a - p) / 86400000);
}

export function addCalendarDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

function isMilestoneDone(completed: boolean, status: string | null | undefined): boolean {
  if (completed === true) return true;
  return String(status ?? "").toUpperCase() === "COMPLETED";
}

/**
 * For FS milestone dependencies: shift each direct successor's due date by `slipDays`
 * when the successor is not done and still has a due date.
 */
export async function shiftDependentMilestoneDueDates(
  tx: Prisma.TransactionClient,
  predecessorId: string,
  slipDays: number,
): Promise<void> {
  if (slipDays === 0) return;

  const edges = await tx.milestoneDependency.findMany({
    where: { dependsOnId: predecessorId },
    select: { milestoneId: true, type: true },
  });

  for (const e of edges) {
    if (normalizeMilestoneDepType(e.type) !== "FS") continue;

    const succ = await tx.milestone.findUnique({
      where: { id: e.milestoneId },
      select: { id: true, dueDate: true, completed: true, status: true },
    });
    if (!succ?.dueDate) continue;
    if (isMilestoneDone(succ.completed, succ.status)) continue;

    const newDue = addCalendarDays(succ.dueDate, slipDays);
    await tx.milestone.update({
      where: { id: succ.id },
      data: { dueDate: newDue },
    });
  }
}
