import {
  authClient,
  projectClient,
  notificationClient,
  type ServiceRecord,
} from '../services/backendClient';

export type ProcessDeadlineDelayNotificationsResult = {
  success: boolean;
  message: string;
  organizerUserId: string | null;
  projectDelaysNotified: number;
  milestoneDelaysNotified: number;
  taskDelaysNotified: number;
};

const PROJECT_TERMINAL = new Set([
  'completed',
  'complete',
  'done',
  'cancelled',
  'canceled',
  'archived',
  'closed',
]);

const TASK_TERMINAL = new Set([
  'done',
  'completed',
  'closed',
  'cancelled',
  'canceled',
]);

function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return utcDayStart(a) === utcDayStart(b);
}

function isTerminalStatus(status: string | null | undefined, terminal: Set<string>): boolean {
  if (!status || typeof status !== 'string') return false;
  return terminal.has(status.trim().toLowerCase());
}

function isProjectOverdue(p: ServiceRecord, now: Date): boolean {
  if (p.deletedAt) return false;
  if (!p.endDate) return false;
  if (isTerminalStatus(p.status, PROJECT_TERMINAL)) return false;
  return new Date(p.endDate as string).getTime() < now.getTime();
}

function isMilestoneOverdue(m: ServiceRecord, now: Date): boolean {
  if (!m.dueDate) return false;
  if (m.completed === true) return false;
  const st = String(m.status ?? '').toUpperCase();
  if (st === 'COMPLETED') return false;
  return new Date(m.dueDate as string).getTime() < now.getTime();
}

function isTaskOverdue(t: ServiceRecord, now: Date): boolean {
  if (!t.dueDate) return false;
  if (isTerminalStatus(t.status, TASK_TERMINAL)) return false;
  return new Date(t.dueDate as string).getTime() < now.getTime();
}

async function loadUserNotificationsToday(
  userId: string,
  cache: Map<string, ServiceRecord[]>,
): Promise<ServiceRecord[]> {
  let list = cache.get(userId);
  if (!list) {
    const rows = await notificationClient.get(
      `/notifications?userId=${encodeURIComponent(userId)}&limit=800`,
    );
    list = Array.isArray(rows) ? rows : [];
    cache.set(userId, list);
  }
  const now = new Date();
  return list.filter((n) => n.createdAt && isSameUtcDay(new Date(n.createdAt as string), now));
}

async function notifyIfNewToday(
  userId: string,
  type: string,
  content: string,
  cache: Map<string, ServiceRecord[]>,
): Promise<boolean> {
  const todayRows = await loadUserNotificationsToday(userId, cache);
  if (todayRows.some((n) => n.type === type)) return false;
  await notificationClient.post('/notifications', {
    userId,
    content,
    type,
    isRead: false,
  });
  const list = cache.get(userId);
  if (list) {
    list.unshift({
      userId,
      type,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    } as ServiceRecord);
  }
  return true;
}

/**
 * Sends in-app notifications for overdue project end dates, milestone due dates, and task due dates.
 *
 * Recipients:
 * - Project delay → project manager + organization organizer
 * - Milestone delay → same (manager + organizer)
 * - Task delay → project manager + task assignee only (not organizer)
 *
 * At most one notification per recipient per entity per UTC calendar day (dedupe via notification.type).
 */
export async function processDeadlineDelayNotificationsForOrganization(
  organizationId: string,
): Promise<ProcessDeadlineDelayNotificationsResult> {
  const now = new Date();
  const notifCache = new Map<string, ServiceRecord[]>();

  const members = await authClient.get(
    `/organization-members?organizationId=${encodeURIComponent(organizationId)}`,
  );
  if (!Array.isArray(members) || members.length === 0) {
    return {
      success: false,
      message: 'No organization members found',
      organizerUserId: null,
      projectDelaysNotified: 0,
      milestoneDelaysNotified: 0,
      taskDelaysNotified: 0,
    };
  }

  const organizerMember = members.find(
    (m: ServiceRecord) => String(m.memberKind ?? '').toUpperCase() === 'ORGANIZER',
  );
  const organizerUserId =
    typeof organizerMember?.userId === 'string' ? organizerMember.userId : null;

  const projects = await projectClient.get(
    `/projects?organizationId=${encodeURIComponent(organizationId)}`,
  );
  if (!Array.isArray(projects)) {
    return {
      success: false,
      message: 'Failed to load projects',
      organizerUserId,
      projectDelaysNotified: 0,
      milestoneDelaysNotified: 0,
      taskDelaysNotified: 0,
    };
  }

  let projectDelaysNotified = 0;
  let milestoneDelaysNotified = 0;
  let taskDelaysNotified = 0;

  for (const project of projects) {
    if (!project || typeof project.id !== 'string') continue;
    if (project.deletedAt) continue;

    const managerId = typeof project.managerId === 'string' ? project.managerId : null;
    const projectName = typeof project.name === 'string' ? project.name : 'Project';

    const managerAndOrganizer = [managerId, organizerUserId].filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    const uniqueManagerOrganizer = [...new Set(managerAndOrganizer)];

    if (isProjectOverdue(project, now)) {
      const type = `delay:project:${project.id}`;
      const content = `Project "${projectName}" is past its target end date. Please review schedule and status.`;
      for (const uid of uniqueManagerOrganizer) {
        if (await notifyIfNewToday(uid, type, content, notifCache)) projectDelaysNotified++;
      }
    }

    const milestones = await projectClient.get(
      `/milestones?projectId=${encodeURIComponent(project.id)}`,
    );
    if (Array.isArray(milestones)) {
      for (const m of milestones) {
        if (!m || typeof m.id !== 'string') continue;
        if (!isMilestoneOverdue(m, now)) continue;
        const title = typeof m.title === 'string' ? m.title : 'Milestone';
        const type = `delay:milestone:${m.id}`;
        const content = `Milestone "${title}" in project "${projectName}" is past its due date.`;
        for (const uid of uniqueManagerOrganizer) {
          if (await notifyIfNewToday(uid, type, content, notifCache)) milestoneDelaysNotified++;
        }
      }
    }

    const tasks = await projectClient.get(
      `/tasks?projectId=${encodeURIComponent(project.id)}`,
    );
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        if (!t || typeof t.id !== 'string') continue;
        if (!isTaskOverdue(t, now)) continue;
        const title = typeof t.title === 'string' ? t.title : 'Task';
        const type = `delay:task:${t.id}`;
        const content = `Task "${title}" in project "${projectName}" is past its due date.`;
        const assigneeId = typeof t.assigneeId === 'string' ? t.assigneeId : null;
        const recipients = [managerId, assigneeId].filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        );
        const uniqueRecipients = [...new Set(recipients)];
        for (const uid of uniqueRecipients) {
          if (await notifyIfNewToday(uid, type, content, notifCache)) taskDelaysNotified++;
        }
      }
    }
  }

  return {
    success: true,
    message: 'Deadline delay notifications processed',
    organizerUserId,
    projectDelaysNotified,
    milestoneDelaysNotified,
    taskDelaysNotified,
  };
}
