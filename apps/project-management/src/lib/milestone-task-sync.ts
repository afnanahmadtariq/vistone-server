import prisma from "./prisma";

/** Task column label used when work is finished (matches app Kanban default). */
const COMPLETED_TASK_STATUS = "Completed";

const WORKFLOW = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  COMPLETED: "COMPLETED",
} as const;

/**
 * Recomputes milestone workflow status from linked top-level tasks (parentId null).
 * Does not run when the milestone is already marked completed (approved / manual).
 */
export async function syncMilestoneWorkflowForMilestoneId(
  milestoneId: string,
): Promise<void> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
  });
  if (!milestone || milestone.completed) return;

  const tasks = await prisma.task.findMany({
    where: {
      milestoneId,
      projectId: milestone.projectId,
      parentId: null,
    },
    select: { status: true },
  });

  let nextStatus: string;
  if (tasks.length === 0) {
    nextStatus = WORKFLOW.NOT_STARTED;
  } else {
    const done = tasks.filter((t) => t.status === COMPLETED_TASK_STATUS).length;
    if (done === 0) nextStatus = WORKFLOW.NOT_STARTED;
    else if (done < tasks.length) nextStatus = WORKFLOW.IN_PROGRESS;
    else nextStatus = WORKFLOW.READY_FOR_APPROVAL;
  }

  if (milestone.status === nextStatus) return;

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: nextStatus,
      completed: false,
      completedAt: null,
    },
  });
}
