import { randomUUID } from 'crypto';
import { GraphQLScalarType, Kind, GraphQLError } from 'graphql';
import {
  authClient,
  workforceClient,
  projectClient,
  clientMgmtClient,
  knowledgeClient,
  communicationClient,
  monitoringClient,
  notificationClient,
  aiEngineClient,
  ServiceRecord,
} from '../services/backendClient';
import { requireAuth, requireOrganizer, requireOrganization, requirePermission, hasMetaPermission, isOrganizer, getOrgId, AuthContext, getCurrentUser, hasRole } from '../lib/auth';
import { verifyTurnstileToken } from '../lib/turnstile';
import { ServiceError } from '../lib/errors';
import { enrichUserWithWorkforceData, type GraphQLLoaders } from '../lib/graphqlLoaders';
import {
  provisionClientOrganizerWorkspaceHub,
  syncClientOrganizerHubParticipants,
} from '../lib/clientOrganizerHub';
import { processDeadlineDelayNotificationsForOrganization } from '../lib/deadlineDelayNotifications';

interface Context extends AuthContext {
  headers: Record<string, string | string[] | undefined>;
  token?: string;
  loaders: GraphQLLoaders;
}

/** Project.metadata flags for client portal (default: visible). */
function portalMetaAllowsTasks(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return true;
  return (metadata as Record<string, unknown>).clientCanViewTasks !== false;
}

function portalMetaAllowsMilestones(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return true;
  return (metadata as Record<string, unknown>).clientCanViewMilestones !== false;
}

/** Align task priority with app UI labels (Low / Medium / High / Urgent). */
function normalizeTaskPriorityForGraphQL(raw: unknown): string {
  if (raw == null || raw === '') return 'Medium';
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  const canonical: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };
  if (canonical[lower]) return canonical[lower];
  if (s.length === 0) return 'Medium';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Validate AI Engine request: user must be authenticated and belong to the organization
 */
async function validateAiRequest(
  context: Context,
  organizationId: string,
  userId?: string
): Promise<void> {
  // Require authentication and organization membership
  const user = await requireOrganization(context, organizationId);

  // If userId is provided, it must match the authenticated user
  if (userId && userId !== user.id) {
    throw new GraphQLError('Forbidden: userId must match the authenticated user', {
      extensions: { code: 'FORBIDDEN', statusCode: 403 },
    });
  }
}

function isUserOrganizer(user: ServiceRecord): boolean {
  const role = (user?.roleName || user?.role || '').toString().toLowerCase();
  return role === 'organizer';
}

function getUserOrganizationId(user: ServiceRecord): string {
  const organizationId = user?.organizationId;
  if (typeof organizationId === 'string' && organizationId) return organizationId;
  throw new GraphQLError('Organization ID is required', {
    extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
  });
}

async function getAccessibleProjectIds(user: ServiceRecord): Promise<Set<string>> {
  const projectIds = new Set<string>();

  const [projectMembers, managedProjects] = await Promise.all([
    projectClient.get(`/project-members?userId=${user.id}`).catch(() => [] as ServiceRecord[]),
    projectClient.get(`/projects?managerId=${user.id}`).catch(() => [] as ServiceRecord[]),
  ]);

  if (Array.isArray(projectMembers)) {
    projectMembers.forEach((pm: ServiceRecord) => {
      if (typeof pm?.projectId === 'string' && pm.projectId) {
        projectIds.add(pm.projectId);
      }
    });
  }

  if (Array.isArray(managedProjects)) {
    managedProjects.forEach((p: ServiceRecord) => {
      if (typeof p?.id === 'string' && p.id) {
        projectIds.add(p.id);
      }
    });
  }

  const orgId = getUserOrganizationId(user);
  const [teamMemberships, orgTeams, allOrgProjects] = await Promise.all([
    workforceClient.get(`/team-members?userId=${user.id}`).catch(() => [] as ServiceRecord[]),
    workforceClient.get(`/teams?organizationId=${orgId}`).catch(() => [] as ServiceRecord[]),
    projectClient.get(`/projects?organizationId=${orgId}`).catch(() => [] as ServiceRecord[]),
  ]);

  const userTeamIds = new Set<string>();
  if (Array.isArray(teamMemberships)) {
    teamMemberships.forEach((tm: ServiceRecord) => {
      if (typeof tm?.teamId === 'string' && tm.teamId) {
        userTeamIds.add(tm.teamId);
      }
    });
  }
  if (Array.isArray(orgTeams)) {
    orgTeams.forEach((team: ServiceRecord) => {
      if (team?.managerId === user.id && typeof team?.id === 'string' && team.id) {
        userTeamIds.add(team.id);
      }
    });
  }
  if (userTeamIds.size > 0 && Array.isArray(allOrgProjects)) {
    allOrgProjects.forEach((p: ServiceRecord) => {
      const projectTeamIds: string[] = Array.isArray(p.teamIds) ? p.teamIds : [];
      if (projectTeamIds.some((tid) => userTeamIds.has(tid)) && typeof p?.id === 'string' && p.id) {
        projectIds.add(p.id);
      }
    });
  }

  // Client portal: CRM-linked projects (project_clients), matched by portal user id or email
  try {
    const clientsInOrg = await clientMgmtClient
      .get(`/clients?organizationId=${encodeURIComponent(orgId)}`)
      .catch(() => [] as ServiceRecord[]);
    if (Array.isArray(clientsInOrg)) {
      const crmIds = new Set<string>();
      const emailNorm =
        typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
      for (const c of clientsInOrg) {
        if (typeof c.portalUserId === 'string' && c.portalUserId === user.id) {
          crmIds.add(c.id as string);
          continue;
        }
        if (
          emailNorm &&
          typeof c.email === 'string' &&
          c.email.trim().toLowerCase() === emailNorm
        ) {
          crmIds.add(c.id as string);
        }
      }
      for (const cid of crmIds) {
        const pcs = await clientMgmtClient
          .get(`/project-clients?clientId=${encodeURIComponent(cid)}`)
          .catch(() => [] as ServiceRecord[]);
        if (Array.isArray(pcs)) {
          pcs.forEach((pc: ServiceRecord) => {
            if (typeof pc.projectId === 'string' && pc.projectId) projectIds.add(pc.projectId);
          });
        }
      }
    }
  } catch {
    /* non-fatal */
  }

  return projectIds;
}

async function resolveChatChannelMemberIds(
  input: ServiceRecord,
  creatorId: string
): Promise<string[]> {
  const memberIds = new Set<string>();

  // Keep explicitly provided members from client payload.
  if (Array.isArray(input.memberIds)) {
    input.memberIds.forEach((id: unknown) => {
      if (typeof id === 'string' && id) memberIds.add(id);
    });
  }

  // Creator should always be a member.
  if (creatorId) memberIds.add(creatorId);

  // For project channels, auto-include all project-linked participants:
  // - external contributors (project-members records)
  // - linked team members (team-members records)
  // - linked team managers
  if (input.type === 'project' && typeof input.projectId === 'string' && input.projectId) {
    const projectId = input.projectId;

    const [projectMembers, project] = await Promise.all([
      projectClient.get(`/project-members?projectId=${projectId}`).catch(() => [] as ServiceRecord[]),
      projectClient.getById('/projects', projectId).catch(() => null),
    ]);

    if (Array.isArray(projectMembers)) {
      projectMembers.forEach((pm: ServiceRecord) => {
        if (typeof pm?.userId === 'string' && pm.userId) memberIds.add(pm.userId);
      });
    }

    const teamIds: string[] = Array.isArray(project?.teamIds) ? project.teamIds : [];
    if (teamIds.length > 0) {
      const [teamMembersByTeam, teams] = await Promise.all([
        Promise.all(
          teamIds.map((teamId) =>
            workforceClient.get(`/team-members?teamId=${teamId}`).catch(() => [] as ServiceRecord[])
          )
        ),
        Promise.all(
          teamIds.map((teamId) => workforceClient.getById('/teams', teamId).catch(() => null))
        ),
      ]);

      teamMembersByTeam.forEach((teamMembers) => {
        if (!Array.isArray(teamMembers)) return;
        teamMembers.forEach((tm: ServiceRecord) => {
          if (typeof tm?.userId === 'string' && tm.userId) memberIds.add(tm.userId);
        });
      });

      teams.forEach((team) => {
        if (typeof team?.managerId === 'string' && team.managerId) memberIds.add(team.managerId);
      });
    }
  }

  return Array.from(memberIds);
}

async function wikiIdsFromLinkedProjects(user: ServiceRecord): Promise<Set<string>> {
  const wikiIds = new Set<string>();
  const accessibleProjectIds = await getAccessibleProjectIds(user);

  await Promise.all(
    Array.from(accessibleProjectIds).map(async (projectId) => {
      const links = await knowledgeClient
        .get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
        .catch(() => [] as ServiceRecord[]);
      if (Array.isArray(links)) {
        links.forEach((link: ServiceRecord) => {
          if (typeof link?.wikiId === 'string' && link.wikiId) {
            wikiIds.add(link.wikiId);
          }
        });
      }
    })
  );

  return wikiIds;
}

/** Wikis linked to projects the user can access, plus wikis where they are an explicit member. */
async function getAccessibleWikiIds(user: ServiceRecord): Promise<Set<string>> {
  const fromProjects = await wikiIdsFromLinkedProjects(user);
  const explicit = await knowledgeClient
    .get(`/wiki-members?userId=${encodeURIComponent(user.id)}`)
    .catch(() => [] as ServiceRecord[]);
  if (Array.isArray(explicit)) {
    for (const row of explicit) {
      if (typeof (row as ServiceRecord)?.wikiId === 'string' && (row as ServiceRecord).wikiId) {
        fromProjects.add((row as ServiceRecord).wikiId as string);
      }
    }
  }
  return fromProjects;
}

async function assertWikiAccess(user: ServiceRecord, wikiId: string): Promise<void> {
  if (isUserOrganizer(user)) return;

  const accessibleWikiIds = await getAccessibleWikiIds(user);
  if (!accessibleWikiIds.has(wikiId)) {
    throw new GraphQLError('Forbidden: wiki is not linked to your accessible projects', {
      extensions: { code: 'FORBIDDEN', statusCode: 403 },
    });
  }
}

async function ensureProjectWikiLink(params: {
  organizationId: string;
  projectId: string;
  projectName?: string | null;
}): Promise<void> {
  const { organizationId, projectId, projectName } = params;
  if (!organizationId || !projectId) return;

  const existingLinks = await knowledgeClient
    .get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
    .catch(() => [] as ServiceRecord[]);
  if (Array.isArray(existingLinks) && existingLinks.length > 0) {
    return;
  }

  const wikiName = (projectName || 'Project Wiki').toString().trim() || 'Project Wiki';
  const createdWiki = await knowledgeClient.post('/wikis', {
    name: wikiName,
    description: `Client workspace wiki for ${wikiName}`,
    organizationId,
  });

  if (createdWiki?.id) {
    await knowledgeClient.post('/wiki-project-links', {
      wikiId: createdWiki.id,
      projectId,
    });
  }
}

const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: unknown) {
    return new Date(value as string | number);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: unknown) {
    return value;
  },
  parseValue(value: unknown) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

const decimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description: 'Decimal custom scalar type',
  serialize(value: unknown) {
    return value ? parseFloat(String(value)) : null;
  },
  parseValue(value: unknown) {
    return value ? parseFloat(String(value)) : null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return parseFloat(ast.value);
    }
    return null;
  },
});

// Helper: build human-readable description from an activity log record
function describeActivity(log: ServiceRecord): string {
  const action = String(log.action || '').toUpperCase();
  const entity = String(log.entityType || '').toLowerCase();
  const meta = (log.metadata || log.details || {}) as Record<string, unknown>;
  const name = meta.name || meta.title || '';

  switch (action) {
    case 'CREATE':
      return `Created ${entity}${name ? ` "${name}"` : ''}`;
    case 'UPDATE':
      return `Updated ${entity}${name ? ` "${name}"` : ''}`;
    case 'DELETE':
      return `Deleted ${entity}${name ? ` "${name}"` : ''}`;
    case 'INVITE':
      return `Invited a new ${entity === 'user' ? 'member' : entity}${name ? ` (${name})` : ''}`;
    case 'LOGIN':
      return 'Logged in';
    case 'LOGOUT':
      return 'Logged out';
    case 'REGISTER':
      return 'New account registered';
    case 'ASSIGN':
      return `Assigned ${entity}${name ? ` "${name}"` : ''}`;
    case 'COMPLETE':
      return `Completed ${entity}${name ? ` "${name}"` : ''}`;
    case 'ARCHIVE':
      return `Archived ${entity}${name ? ` "${name}"` : ''}`;
    case 'UPLOAD':
      return `Uploaded ${entity === 'document' ? 'document' : 'file'}${name ? ` "${name}"` : ''}`;
    case 'LINK':
      return `Linked ${entity}${name ? ` "${name}"` : ''}`;
    case 'UNLINK':
      return `Unlinked ${entity}${name ? ` "${name}"` : ''}`;
    default:
      return `${action.charAt(0) + action.slice(1).toLowerCase()} ${entity}${name ? ` "${name}"` : ''}`;
  }
}

/**
 * Helper function to delete a user's data across all services.
 * This is used for both individual user deletion and organization-wide cleanup.
 */
async function deleteUserCrossServiceData(userId: string): Promise<void> {
  // Clean up workforce data (team memberships, skills, availability)
  try {
    const teamMembers = await workforceClient.get(`/team-members?userId=${userId}`);
    if (Array.isArray(teamMembers)) {
      for (const tm of teamMembers) {
        await workforceClient.delete('/team-members', tm.id);
      }
    }
    const userSkills = await workforceClient.get(`/user-skills?userId=${userId}`);
    if (Array.isArray(userSkills)) {
      for (const skill of userSkills) {
        await workforceClient.delete('/user-skills', skill.id);
      }
    }
    const availability = await workforceClient.get(`/user-availability?userId=${userId}`);
    if (Array.isArray(availability)) {
      for (const avail of availability) {
        await workforceClient.delete('/user-availability', avail.id);
      }
    }
    try {
      const members = await authClient.get(`/organization-members?userId=${encodeURIComponent(userId)}`);
      if (Array.isArray(members) && members.length > 0) {
        const organizationId = members[0]?.organizationId;
        if (typeof organizationId === 'string' && organizationId) {
          await workforceClient.post('/attendance-logs/purge-for-user', {
            userId,
            organizationId,
          });
        }
      }
    } catch (e) {
      console.error(`[deleteUserCrossServiceData] Error purging attendance for ${userId}:`, e);
    }
  } catch (error) {
    console.error(`[deleteUserCrossServiceData] Error cleaning workforce data for ${userId}:`, error);
  }

  // Clean up project memberships
  try {
    const projectMembers = await projectClient.get(`/project-members?userId=${userId}`);
    if (Array.isArray(projectMembers)) {
      for (const pm of projectMembers) {
        await projectClient.delete('/project-members', pm.id);
      }
    }
    // Unassign user from tasks
    const tasks = await projectClient.get(`/tasks?assigneeId=${userId}`);
    if (Array.isArray(tasks)) {
      for (const task of tasks) {
        await projectClient.put('/tasks', task.id, { assigneeId: null });
      }
    }
  } catch (error) {
    console.error(`[deleteUserCrossServiceData] Error cleaning project data for ${userId}:`, error);
  }

  // Clean up communication data
  try {
    const channelMembers = await communicationClient.get(`/channel-members?userId=${userId}`);
    if (Array.isArray(channelMembers)) {
      for (const cm of channelMembers) {
        await communicationClient.delete('/channel-members', cm.id);
      }
    }
  } catch (error) {
    console.error(`[deleteUserCrossServiceData] Error cleaning communication data for ${userId}:`, error);
  }

  // Clean up notification preferences
  try {
    const notifPrefs = await notificationClient.get(`/notification-preferences?userId=${userId}`);
    if (Array.isArray(notifPrefs)) {
      for (const pref of notifPrefs) {
        await notificationClient.delete('/notification-preferences', pref.id);
      }
    }
  } catch (error) {
    console.error(`[deleteUserCrossServiceData] Error cleaning notification data for ${userId}:`, error);
  }
}

export const resolvers = {
  DateTime: dateTimeScalar,
  JSON: jsonScalar,
  Decimal: decimalScalar,

  Query: {
    // Authentication
    me: async (_: unknown, _args: unknown, context: Context) => {
      if (!context.token) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED', statusCode: 401 },
        });
      }
      const rawOrg = context.headers['x-organization-id'];
      const organizationId =
        typeof rawOrg === 'string'
          ? rawOrg.trim()
          : Array.isArray(rawOrg)
            ? String(rawOrg[0] ?? '').trim()
            : undefined;
      return authClient.postWithAuth(
        '/auth/me',
        { organizationId: organizationId || undefined },
        context.token,
        organizationId
      );
    },
    getInviteDetails: async (_: unknown, { token }: { token: string }) => {
      return authClient.get(`/auth/invite-details/${token}`);
    },

    // Users & Organizations (Auth Service) — org-scoped
    users: async (_: unknown, { organizationId: organizationIdArg }: { organizationId?: string }, context: Context) => {
      const user = await requireAuth(context);
      let orgId: string;
      if (organizationIdArg) {
        await requireOrganization(context, organizationIdArg);
        orgId = organizationIdArg;
      } else {
        orgId = getOrgId(user);
      }
      const users = await authClient.get(
        `/users?organizationId=${encodeURIComponent(orgId)}`
      );
      const list = Array.isArray(users) ? users : [];
      return Promise.all(list.map(enrichUserWithWorkforceData));
    },
    user: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      const user = await authClient.getById('/users', id);
      return enrichUserWithWorkforceData(user);
    },
    organizations: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      const orgId = getOrgId(user);
      return [await authClient.getById('/organizations', orgId)];
    },
    organization: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireOrganization(context, id);
      return authClient.getById('/organizations', id);
    },
    organizationMembers: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      const orgId = getOrgId(user);
      return authClient.get(`/organization-members?organizationId=${orgId}`);
    },
    organizationMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return authClient.getById('/organization-members', id);
    },
    roles: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      const orgId = getOrgId(user);
      return authClient.get(`/roles?organizationId=${orgId}`);
    },
    role: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return authClient.getById('/roles', id);
    },
    roleDefinitions: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return authClient.get('/roles/definitions');
    },
    kycData: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return authClient.get('/kyc-data');
    },
    kycDataById: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return authClient.getById('/kyc-data', id);
    },
    mfaSettings: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return authClient.get('/mfa-settings');
    },
    mfaSetting: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return authClient.getById('/mfa-settings', id);
    },
    activityLogs: async (
      _: unknown,
      {
        organizationId: organizationIdArg,
        userId,
        action,
        entityType,
        limit,
        offset,
      }: {
        organizationId?: string;
        userId?: string;
        action?: string;
        entityType?: string;
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      const user = await requirePermission(context, 'settings', 'read');
      let organizationId: string;
      if (organizationIdArg) {
        await requireOrganization(context, organizationIdArg);
        organizationId = organizationIdArg;
      } else {
        organizationId = getOrgId(user);
      }
      const params = new URLSearchParams();
      params.append('organizationId', organizationId);
      if (userId) params.append('userId', userId);
      if (action) params.append('action', action);
      if (entityType) params.append('entityType', entityType);
      const logs = await authClient.get(`/activity-logs?${params.toString()}`);
      if (!Array.isArray(logs)) return [];
      // Apply offset and limit in-memory (backend returns all matching)
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      const sliced = logs.slice(start, end);
      // Enrich each log with description and user info
      return Promise.all(
        sliced.map(async (log: ServiceRecord) => {
          let user = null;
          if (log.userId) {
            try {
              user = await context.loaders.enrichedUser.load(String(log.userId));
            } catch { /* ignore */ }
          }
          return {
            ...log,
            description: describeActivity(log),
            user,
          };
        })
      );
    },
    activityLog: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return authClient.getById('/activity-logs', id);
    },

    // Teams (Workforce Service) â€” org-scoped
    teams: async (_: unknown, { organizationId }: { organizationId?: string }, context: Context) => {
      const user = await requirePermission(context, 'teams', 'read');
      let orgId: string;
      if (organizationId) {
        await requireOrganization(context, organizationId);
        orgId = organizationId;
      } else {
        orgId = getOrgId(user);
      }
      return workforceClient.get(`/teams?organizationId=${orgId}`);
    },
    team: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'teams', 'read');
      return workforceClient.getById('/teams', id);
    },
    teamMembers: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'teams', 'read');
      return workforceClient.get('/team-members');
    },
    teamMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'teams', 'read');
      return workforceClient.getById('/team-members', id);
    },
    userSkills: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return workforceClient.get('/user-skills');
    },
    userSkill: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.getById('/user-skills', id);
    },
    userAvailability: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return workforceClient.get('/user-availability');
    },
    userAvailabilityById: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.getById('/user-availability', id);
    },
    attendanceLogs: async (
      _: unknown,
      args: {
        organizationId: string;
        userId?: string | null;
        workDateFrom?: string | null;
        workDateTo?: string | null;
      },
      context: Context
    ) => {
      await requireAuth(context);
      await requireOrganization(context, args.organizationId);
      const params = new URLSearchParams();
      params.set('organizationId', args.organizationId);
      if (args.userId) params.set('userId', String(args.userId));
      if (args.workDateFrom) params.set('workDateFrom', String(args.workDateFrom));
      if (args.workDateTo) params.set('workDateTo', String(args.workDateTo));
      return workforceClient.get(`/attendance-logs?${params.toString()}`);
    },
    attendanceLog: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.getById('/attendance-logs', id);
    },

    // Projects (Project Service) â€” org-scoped
    projects: async (_: unknown, { status, search, organizationId }: { status?: string; search?: string; organizationId?: string }, context: Context) => {
      const user = await requirePermission(context, 'projects', 'read');
      let orgId: string;
      if (organizationId) {
        await requireOrganization(context, organizationId);
        orgId = organizationId;
      } else {
        orgId = getOrgId(user);
      }
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      params.append('organizationId', orgId);
      return projectClient.get(`/projects?${params.toString()}`);
    },
    project: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.getById('/projects', id);
    },
    projectMembers: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.get('/project-members');
    },
    projectMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.getById('/project-members', id);
    },
    tasks: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.get('/tasks');
    },
    task: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.getById('/tasks', id);
    },
    taskChecklists: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.get('/task-checklists');
    },
    taskChecklist: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.getById('/task-checklists', id);
    },
    taskDependencies: async (
      _: unknown,
      args: { taskId?: string | null; projectId?: string | null },
      context: Context
    ) => {
      await requirePermission(context, 'tasks', 'read');
      const params = new URLSearchParams();
      if (args.taskId) params.set('taskId', String(args.taskId));
      if (args.projectId) params.set('projectId', String(args.projectId));
      const q = params.toString();
      return projectClient.get(`/task-dependencies${q ? `?${q}` : ''}`);
    },
    taskDependency: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.getById('/task-dependencies', id);
    },
    milestoneDependencies: async (
      _: unknown,
      args: { milestoneId?: string | null; projectId?: string | null },
      context: Context
    ) => {
      await requirePermission(context, 'projects', 'read');
      const params = new URLSearchParams();
      if (args.milestoneId) params.set('milestoneId', String(args.milestoneId));
      if (args.projectId) params.set('projectId', String(args.projectId));
      const q = params.toString();
      return projectClient.get(`/milestone-dependencies${q ? `?${q}` : ''}`);
    },
    taskSubmissions: async (
      _: unknown,
      { taskId, status }: { taskId: string; status?: string | null },
      context: Context
    ) => {
      await requirePermission(context, 'tasks', 'read');
      const params = new URLSearchParams({ taskId });
      if (status) params.set('status', status);
      return projectClient.get(`/task-submissions?${params.toString()}`);
    },
    milestones: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.get('/milestones');
    },
    milestone: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.getById('/milestones', id);
    },
    riskRegisters: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.get('/risk-register');
    },
    riskRegister: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.getById('/risk-register', id);
    },
    aiInsights: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.get('/ai-insights');
    },
    aiInsight: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'read');
      return projectClient.getById('/ai-insights', id);
    },

    // Clients (Client Management Service) â€” org-scoped, require clients:read
    clients: async (_: unknown, { search, status, industry, organizationId }: { search?: string; status?: string; industry?: string; organizationId?: string }, context: Context) => {
      const user = await requirePermission(context, 'clients', 'read');
      let orgId: string;
      if (organizationId) {
        await requireOrganization(context, organizationId);
        orgId = organizationId;
      } else {
        orgId = getOrgId(user);
      }
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (industry) params.append('industry', industry);
      params.append('organizationId', orgId);
      return clientMgmtClient.get(`/clients?${params.toString()}`);
    },
    client: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.getById('/clients', id);
    },
    projectClients: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.get('/project-clients');
    },
    projectClient: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.getById('/project-clients', id);
    },
    clientFeedbacks: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.get('/client-feedback');
    },
    clientFeedback: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.getById('/client-feedback', id);
    },
    proposals: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.get('/proposals');
    },
    proposal: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'read');
      return clientMgmtClient.getById('/proposals', id);
    },

    // Documentation (Knowledge Hub Service) â€” require wiki:read
    wikis: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      await requireOrganization(context, organizationId);
      const allWikis = await knowledgeClient.get(`/wikis?organizationId=${organizationId}`);
      if (!Array.isArray(allWikis) || isUserOrganizer(user)) return allWikis;

      const accessibleWikiIds = await getAccessibleWikiIds(user);
      return allWikis.filter((wiki: ServiceRecord) => accessibleWikiIds.has(wiki.id));
    },
    wiki: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      await assertWikiAccess(user, id);
      return knowledgeClient.getById('/wikis', id);
    },
    wikiProjectLinks: async (_: unknown, { projectId, wikiId }: { projectId?: string; wikiId?: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (wikiId) params.append('wikiId', wikiId);
      return knowledgeClient.get(`/wiki-project-links?${params.toString()}`);
    },
    wikiMembers: async (_: unknown, { wikiId }: { wikiId: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      await assertWikiAccess(user, wikiId);
      return knowledgeClient.get(`/wiki-members?wikiId=${encodeURIComponent(wikiId)}`);
    },
    wikiPages: async (_: unknown, { wikiId }: { wikiId: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      await assertWikiAccess(user, wikiId);
      return knowledgeClient.get(`/wiki-pages?wikiId=${wikiId}`);
    },
    wikiPage: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      const page = await knowledgeClient.getById('/wiki-pages', id);
      if (page?.wikiId) {
        await assertWikiAccess(user, page.wikiId);
      }
      return page;
    },
    wikiPageVersions: async (_: unknown, { wikiPageId }: { wikiPageId: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      const page = await knowledgeClient.getById('/wiki-pages', wikiPageId);
      if (page?.wikiId) {
        await assertWikiAccess(user, page.wikiId);
      }
      return knowledgeClient.get(`/wiki-page-versions?wikiPageId=${wikiPageId}`);
    },
    documentFolders: async (_: unknown, { wikiId }: { wikiId: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      await assertWikiAccess(user, wikiId);
      return knowledgeClient.get(`/document-folders?wikiId=${wikiId}`);
    },
    documentFolder: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      const folder = await knowledgeClient.getById('/document-folders', id);
      if (folder?.wikiId) {
        await assertWikiAccess(user, folder.wikiId);
      }
      return folder;
    },
    documents: async (_: unknown, { wikiId, folderId }: { wikiId: string; folderId?: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      await assertWikiAccess(user, wikiId);
      const params = new URLSearchParams({ wikiId });
      if (folderId) params.append('folderId', folderId);
      return knowledgeClient.get(`/documents?${params.toString()}`);
    },
    document: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      const doc = await knowledgeClient.getById('/documents', id);
      if (doc?.wikiId) {
        await assertWikiAccess(user, doc.wikiId);
      }
      return doc;
    },
    documentVersions: async (_: unknown, { documentId }: { documentId: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      const doc = await knowledgeClient.getById('/documents', documentId);
      if (doc?.wikiId) {
        await assertWikiAccess(user, doc.wikiId);
      }
      const rows = await knowledgeClient.get(`/documents/${encodeURIComponent(documentId)}/versions`);
      return Array.isArray(rows) ? rows : [];
    },
    documentPermissions: async (_: unknown, { documentId }: { documentId: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.get(`/document-permissions?documentId=${documentId}`);
    },

    // Communication (Communication Service) â€" require channels:read
    chatChannels: async (_: unknown, { organizationId, userId, type, projectId }: { organizationId: string; userId?: string; type?: string; projectId?: string }, context: Context) => {
      await requirePermission(context, 'channels', 'read');
      await requireOrganization(context, organizationId);
      const params = new URLSearchParams({ organizationId });
      if (userId) params.append('userId', userId);
      if (type) params.append('type', type);
      if (projectId) params.append('projectId', projectId);
      return communicationClient.get(`/chat-channels?${params.toString()}`);
    },
    chatChannel: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'channels', 'read');
      return communicationClient.getById('/chat-channels', id);
    },
    channelMembers: async (_: unknown, { channelId }: { channelId: string }, context: Context) => {
      await requirePermission(context, 'channels', 'read');
      return communicationClient.get(`/channel-members?channelId=${channelId}`);
    },
    channelMedia: async (_: unknown, { channelId, cursor, limit, fileType }: { channelId: string; cursor?: string; limit?: number; fileType?: string }, context: Context) => {
      await requirePermission(context, 'channels', 'read');
      const params = new URLSearchParams({ channelId });
      if (cursor) params.append('cursor', cursor);
      if (limit) params.append('limit', String(limit));
      if (fileType) params.append('fileType', fileType);
      return communicationClient.get(`/messages/media?${params.toString()}`);
    },

    // AI & Automation (Monitoring Service)
    aiConversations: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return monitoringClient.get('/ai-conversations');
    },
    aiConversation: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.getById('/ai-conversations', id);
    },
    automationRules: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return monitoringClient.get('/automation-rules');
    },
    automationRule: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return monitoringClient.getById('/automation-rules', id);
    },
    automationLogs: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return monitoringClient.get('/automation-logs');
    },
    automationLog: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return monitoringClient.getById('/automation-logs', id);
    },

    // Monitoring (Monitoring Service) â€” require reports:read
    kpiDefinitions: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.get('/kpi-definitions');
    },
    kpiDefinition: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.getById('/kpi-definitions', id);
    },
    kpiMeasurements: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.get('/kpi-measurements');
    },
    kpiMeasurement: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.getById('/kpi-measurements', id);
    },
    reportTemplates: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.get('/report-templates');
    },
    reportTemplate: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.getById('/report-templates', id);
    },
    generatedReports: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.get('/generated-reports');
    },
    generatedReport: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.getById('/generated-reports', id);
    },
    memberPerformances: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.get('/member-performance');
    },
    memberPerformance: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.getById('/member-performance', id);
    },
    dashboards: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return monitoringClient.get('/dashboards');
    },
    dashboard: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.getById('/dashboards', id);
    },
    dashboardWidgets: async (_: unknown, _args: unknown, context: Context) => {
      await requireAuth(context);
      return monitoringClient.get('/dashboard-widgets');
    },
    dashboardWidget: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.getById('/dashboard-widgets', id);
    },

    // Report Schedules (Monitoring Service) â€” org-scoped, require reports:read
    reportSchedules: async (_: unknown, { organizationId }: { organizationId?: string }, context: Context) => {
      const user = await requirePermission(context, 'reports', 'read');
      let orgId: string;
      if (organizationId) {
        await requireOrganization(context, organizationId);
        orgId = organizationId;
      } else {
        orgId = getOrgId(user);
      }
      return monitoringClient.get(`/report-schedules?organizationId=${orgId}`);
    },
    reportSchedule: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'read');
      return monitoringClient.getById('/report-schedules', id);
    },

    // Notifications (Notification Service) â€” require notifications:read
    notificationTemplates: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'notifications', 'read');
      return notificationClient.get('/notification-templates');
    },
    notificationTemplate: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'notifications', 'read');
      return notificationClient.getById('/notification-templates', id);
    },
    notificationPreferences: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'notifications', 'read');
      return notificationClient.get('/notification-preferences');
    },
    notificationPreference: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'notifications', 'read');
      return notificationClient.getById('/notification-preferences', id);
    },
    notifications: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'notifications', 'read');
      return notificationClient.get('/notifications');
    },
    notification: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'notifications', 'read');
      return notificationClient.getById('/notifications', id);
    },

    // AI Engine
    aiChatStats: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.getWithAuth(`/api/sync/stats/${organizationId}`, context.token || '', organizationId);
    },

    // Analytics & Dashboard
    myProjects: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      const projectIds = new Set<string>();

      try {
        // 1. As Member/Manager (direct project membership or assigned manager)
        const projectMembers = await projectClient.get(`/project-members?userId=${user.id}`);
        if (Array.isArray(projectMembers)) {
          projectMembers.forEach((pm: ServiceRecord) => projectIds.add(pm.projectId));
        }

        const managedProjects = await projectClient.get(`/projects?managerId=${user.id}`);
        if (Array.isArray(managedProjects)) {
          managedProjects.forEach((p: ServiceRecord) => projectIds.add(p.id));
        }

        // 2. Via team assignment — projects with this user's team in their teamIds.
        // Includes both explicit team-members rows and teams managed by the user.
        try {
          const orgId = getOrgId(user);

          const [teamMemberships, orgTeams, allOrgProjects] = await Promise.all([
            workforceClient.get(`/team-members?userId=${user.id}`).catch(() => [] as ServiceRecord[]),
            workforceClient.get(`/teams?organizationId=${orgId}`).catch(() => [] as ServiceRecord[]),
            projectClient.get(`/projects?organizationId=${orgId}`).catch(() => [] as ServiceRecord[]),
          ]);

          const userTeamIds = new Set<string>();

          if (Array.isArray(teamMemberships)) {
            teamMemberships.forEach((tm: ServiceRecord) => {
              if (typeof tm?.teamId === 'string' && tm.teamId) {
                userTeamIds.add(tm.teamId);
              }
            });
          }

          if (Array.isArray(orgTeams)) {
            orgTeams.forEach((team: ServiceRecord) => {
              if (team?.managerId === user.id && typeof team?.id === 'string' && team.id) {
                userTeamIds.add(team.id);
              }
            });
          }

          if (userTeamIds.size > 0 && Array.isArray(allOrgProjects)) {
            allOrgProjects.forEach((p: ServiceRecord) => {
              const projectTeamIds: string[] = Array.isArray(p.teamIds) ? p.teamIds : [];
              if (projectTeamIds.some((tid) => userTeamIds.has(tid))) {
                projectIds.add(p.id);
              }
            });
          }
        } catch { /* ignore if workforce service unavailable */ }

        // 3. As Client contact person
        const clients = await clientMgmtClient.get(`/clients?contactPersonId=${user.id}`);
        if (Array.isArray(clients)) {
          for (const client of clients) {
            // Check project-clients link table
            const pcs = await clientMgmtClient.get(`/project-clients?clientId=${client.id}`);
            if (Array.isArray(pcs)) {
              pcs.forEach((pc: ServiceRecord) => projectIds.add(pc.projectId));
            }

            // Also directly query projects that have clientId assigned as a fallback
            try {
              const clientAssignedProjects = await projectClient.get(`/projects?clientId=${client.id}`);
              if (Array.isArray(clientAssignedProjects)) {
                clientAssignedProjects.forEach((p: ServiceRecord) => projectIds.add(p.id));
              }
            } catch { /* ignore if not found */ }
          }
        }

        // Fetch all unique projects
        const projects = await Promise.all(
          Array.from(projectIds).map((id) => projectClient.getById('/projects', id).catch(() => null))
        );

        return projects.filter(Boolean);
      } catch {
        return [];
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    analyticsOverview: async (_: unknown, { organizationId, dateRange: _dateRange }: { organizationId: string; dateRange: { startDate: string; endDate: string } }, context: Context) => {
      await requireOrganization(context, organizationId);

      try {
        // Get all projects for the organization
        const projects = await projectClient.get(`/projects?organizationId=${organizationId}`);
        const projectArray = Array.isArray(projects) ? projects : [];

        // Get all tasks, milestones, and risks in parallel (per-project fan-out)
        const [taskGroups, milestoneGroups, riskGroups] = await Promise.all([
          Promise.all(
            projectArray.map((p: ServiceRecord) =>
              projectClient.get(`/tasks?projectId=${p.id}`).catch(() => [] as ServiceRecord[])
            )
          ),
          Promise.all(
            projectArray.map((p: ServiceRecord) =>
              projectClient.get(`/milestones?projectId=${p.id}`).catch(() => [] as ServiceRecord[])
            )
          ),
          Promise.all(
            projectArray.map((p: ServiceRecord) =>
              projectClient.get(`/risk-register?projectId=${p.id}`).catch(() => [] as ServiceRecord[])
            )
          ),
        ]);
        const allTasks: ServiceRecord[] = (taskGroups as ServiceRecord[][]).flat();
        const allMilestones: ServiceRecord[] = (milestoneGroups as ServiceRecord[][]).flat();
        const allRisks: ServiceRecord[] = (riskGroups as ServiceRecord[][]).flat();

        // Calculate stats
        const totalProjects = projectArray.length;
        const activeProjects = projectArray.filter((p: ServiceRecord) => p.status === 'Active' || p.status === 'In Progress').length;
        const completedMilestones = allMilestones.filter((m: ServiceRecord) => m.completed || m.status === 'Completed').length;
        const identifiedRisks = allRisks.length;

        // Task distribution
        const taskStatusCounts: Record<string, number> = {};
        for (const task of allTasks) {
          const status = task.status || 'To Do';
          taskStatusCounts[status] = (taskStatusCounts[status] || 0) + 1;
        }
        const taskDistribution = Object.entries(taskStatusCounts).map(([status, count]) => ({ status, count }));

        // Calculate average productivity (completed tasks / total tasks * 100)
        const completedTasks = allTasks.filter((t: ServiceRecord) => t.status === 'Completed' || t.status === 'Done').length;
        const avgProductivity = allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0;

        return {
          totalProjects,
          activeProjects,
          completedMilestones,
          avgProductivity,
          identifiedRisks,
          expenseProfitData: [],
          taskDistribution,
          teamPerformance: [],
          riskScores: [],
        };
      } catch (error) {
        console.error('Error fetching analytics overview:', error);
        return {
          totalProjects: 0,
          activeProjects: 0,
          completedMilestones: 0,
          avgProductivity: 0,
          identifiedRisks: 0,
          expenseProfitData: [],
          taskDistribution: [],
          teamPerformance: [],
          riskScores: [],
        };
      }
    },

    dashboardStats: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      const { loaders } = context;

      try {
        // Get all projects for the organization
        const projects = await projectClient.get(`/projects?organizationId=${organizationId}`);
        const projectArray = Array.isArray(projects) ? projects : [];

        const totalProjects = projectArray.length;
        const activeProjects = projectArray.filter((p: ServiceRecord) => p.status === 'Active' || p.status === 'In Progress').length;

        // Tasks + milestones per project in parallel (avoid sequential N round-trips)
        const perProjectStats = await Promise.all(
          projectArray.map(async (project: ServiceRecord) => {
            try {
              const [tasks, milestones] = await Promise.all([
                projectClient.get(`/tasks?projectId=${project.id}`).catch(() => []),
                projectClient.get(`/milestones?projectId=${project.id}`).catch(() => []),
              ]);
              return { project, tasks, milestones };
            } catch {
              return { project, tasks: [], milestones: [] };
            }
          })
        );

        let totalTasks = 0;
        let completedTasks = 0;
        const allMilestones: ServiceRecord[] = [];
        for (const { project, tasks, milestones } of perProjectStats) {
          if (Array.isArray(tasks)) {
            totalTasks += tasks.length;
            completedTasks += tasks.filter((t: ServiceRecord) => t.status === 'Completed' || t.status === 'Done').length;
          }
          if (Array.isArray(milestones)) {
            allMilestones.push(
              ...milestones.map((m: ServiceRecord) => ({
                ...m,
                projectId: project.id,
                projectName: project.name,
              }))
            );
          }
        }

        // Get upcoming milestones (not completed, due in the future)
        const now = new Date();
        const upcomingMilestones = allMilestones
          .filter((m: ServiceRecord) => !m.completed && m.status !== 'Completed' && new Date(m.dueDate) >= now)
          .sort((a: ServiceRecord, b: ServiceRecord) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5)
          .map((m: ServiceRecord) => ({
            id: m.id,
            title: m.title || m.name,
            projectId: m.projectId,
            projectName: m.projectName,
            dueDate: m.dueDate,
          }));

        // Get recent activity logs (meaningful descriptions, exclude noise)
        let recentActivities: ServiceRecord[] = [];
        try {
          const activityLogs = await authClient.get(
            `/activity-logs?organizationId=${encodeURIComponent(organizationId)}`
          );
          if (Array.isArray(activityLogs)) {
            // Resolve user info for activities (org-scoped logs only)
            recentActivities = await Promise.all(
              activityLogs
                .slice(0, 10)
                .map(async (log: ServiceRecord) => {
                  let user = null;
                  if (log.userId) {
                    try {
                      user = await loaders.enrichedUser.load(String(log.userId));
                    } catch { /* ignore */ }
                  }
                  return {
                    id: log.id,
                    type: log.action,
                    description: describeActivity(log),
                    timestamp: log.createdAt,
                    user,
                    project: null,
                  };
                })
            );
          }
        } catch { /* ignore */ }

        // Get teams for utilization
        let teamUtilization: ServiceRecord[] = [];
        try {
          const teams = await workforceClient.get(`/teams?organizationId=${organizationId}`);
          if (Array.isArray(teams)) {
            teamUtilization = teams.slice(0, 5).map((team: ServiceRecord) => ({
              teamId: team.id,
              teamName: team.name,
              utilization: Math.random() * 100, // Placeholder - would need actual tracking
            }));
          }
        } catch { /* ignore */ }

        return {
          totalProjects,
          activeProjects,
          completedTasks,
          totalTasks,
          upcomingMilestones,
          recentActivities,
          teamUtilization,
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          totalProjects: 0,
          activeProjects: 0,
          completedTasks: 0,
          totalTasks: 0,
          upcomingMilestones: [],
          recentActivities: [],
          teamUtilization: [],
        };
      }
    },

    clientDashboardStats: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      
      try {
        // Get all projects for this client user
        const projectIds = new Set<string>();
        
        // Find Client entities where this user is the contact person (parallel per client)
        const clients = await clientMgmtClient.get(`/clients?contactPersonId=${user.id}`);
        if (Array.isArray(clients) && clients.length > 0) {
          await Promise.all(
            clients.map(async (client: ServiceRecord) => {
              const pcs = await clientMgmtClient
                .get(`/project-clients?clientId=${client.id}`)
                .catch(() => []);
              if (Array.isArray(pcs)) {
                pcs.forEach((pc: ServiceRecord) => projectIds.add(pc.projectId));
              }
              try {
                const clientAssignedProjects = await projectClient
                  .get(`/projects?clientId=${client.id}`)
                  .catch(() => []);
                if (Array.isArray(clientAssignedProjects)) {
                  clientAssignedProjects.forEach((p: ServiceRecord) => projectIds.add(p.id));
                }
              } catch { /* ignore if not found */ }
            })
          );
        }
        
        // Fetch Projects
        const projects = (await Promise.all(
          Array.from(projectIds).map(id => projectClient.getById('/projects', id).catch(() => null))
        )).filter(Boolean) as ServiceRecord[];
        
        // Calculate Stats
        const totalProjects = projects.length;
        const ongoingProjects = projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length;
        const completedProjects = projects.filter(p => p.status === 'Completed').length;
        const pendingApprovals = projects.filter(p => p.status === 'Pending Approval' || p.status === 'Approval Requested').length;
        
        const totalContractValue = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
        
        // Fetch Activities for these projects in parallel
        const activityBatches = await Promise.all(
          projects.map((project) =>
            authClient
              .get(`/activity-logs?entityType=project&entityId=${project.id}`)
              .catch(() => [])
          )
        );
        const activities: ServiceRecord[] = [];
        activityBatches.forEach((logs, idx) => {
          const project = projects[idx];
          if (!Array.isArray(logs)) return;
          logs.forEach((log: ServiceRecord) => {
            activities.push({
              id: log.id,
              type: log.action || 'update',
              description: log.description || `${log.action} on project ${project.name}`,
              timestamp: log.createdAt,
              userId: log.userId,
              projectId: project.id,
              project,
            });
          });
        });
        
        // Sort and limit activities
        const recentActivities = activities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        return {
          totalProjects,
          ongoingProjects,
          completedProjects,
          pendingApprovals,
          totalContractValue,
          recentActivities
        };
      } catch (error) {
        console.error('Error fetching client dashboard stats:', error);
        return {
          totalProjects: 0,
          ongoingProjects: 0,
          completedProjects: 0,
          pendingApprovals: 0,
          totalContractValue: 0,
          recentActivities: []
        };
      }
    },
  },

  AttendanceLog: {
    user: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.userId) return null;
      try {
        return await context.loaders.enrichedUser.load(String(parent.userId));
      } catch {
        return null;
      }
    },
  },

  Team: {
    members: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      try {
        const teamMembers = await workforceClient.get(`/team-members?teamId=${parent.id}`);
        if (!Array.isArray(teamMembers) || teamMembers.length === 0) return [];

        const members = await Promise.all(
          teamMembers.map(async (tm: ServiceRecord) => {
            if (!tm.userId) return null;
            try {
              const user = await context.loaders.enrichedUser.load(tm.userId);
              if (!user) return null;
              return {
                id: user.id,
                name:
                  [user.firstName, user.lastName]
                    .filter((part: unknown) => typeof part === 'string' && part.trim().length > 0)
                    .join(' ')
                    .trim() || user.name || null,
                role: user.role || tm.role || null,
                jobTitle: user.jobTitle || null,
                email: user.email || null,
                status: user.status || null,
                avatar: user.avatar || null,
              };
            } catch {
              return null;
            }
          })
        );

        return members.filter(Boolean);
      } catch {
        return [];
      }
    },
  },

  Project: {
    tasks: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      const user = await getCurrentUser(context);
      if (user && hasRole(user, 'client') && !portalMetaAllowsTasks(parent.metadata)) {
        return [];
      }
      try {
        return await projectClient.get(`/tasks?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    milestones: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      const user = await getCurrentUser(context);
      if (user && hasRole(user, 'client') && !portalMetaAllowsMilestones(parent.metadata)) {
        return [];
      }
      try {
        return await projectClient.get(`/milestones?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    client: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.clientId) return null;
      try {
        return await context.loaders.clientById.load(parent.clientId);
      } catch {
        return null;
      }
    },
    manager: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.managerId) return null;
      return context.loaders.enrichedUser.load(parent.managerId);
    },
    members: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      try {
        const projectMembers = await context.loaders.projectMembersByProjectId.load(parent.id);
        if (projectMembers.length === 0) return [];

        const members = await Promise.all(
          projectMembers.map((pm: ServiceRecord) => context.loaders.enrichedUser.load(pm.userId))
        );
        return members.filter(Boolean);
      } catch {
        return [];
      }
    },
    memberIds: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      try {
        const projectMembers = await context.loaders.projectMembersByProjectId.load(parent.id);
        return projectMembers.map((pm: ServiceRecord) => pm.userId);
      } catch {
        return [];
      }
    },
    teams: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.teamIds || parent.teamIds.length === 0) return [];
      try {
        const teams = await Promise.all(
          parent.teamIds.map((teamId: string) => context.loaders.teamById.load(teamId))
        );
        return teams.filter(Boolean);
      } catch {
        return [];
      }
    },
    activities: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      try {
        // Get activity logs related to this project
        const orgQuery = parent.organizationId
          ? `&organizationId=${encodeURIComponent(String(parent.organizationId))}`
          : '';
        const activityLogs = await authClient.get(
          `/activity-logs?entityType=project&entityId=${parent.id}${orgQuery}`
        );
        if (!Array.isArray(activityLogs)) return [];

        // Transform activity logs to ProjectActivity format
        const activities = await Promise.all(
          activityLogs.slice(0, 20).map(async (log: ServiceRecord) => {
            let user = null;
            if (log.userId) {
              try {
                user = await context.loaders.enrichedUser.load(log.userId);
              } catch { /* ignore */ }
            }
            return {
              id: log.id,
              type: log.action || 'update',
              description: log.description || `${log.action} on project`,
              timestamp: log.createdAt,
              userId: log.userId,
              user,
              projectId: parent.id,
            };
          })
        );
        return activities;
      } catch {
        // If no activity logs available, return empty array
        return [];
      }
    },
    documents: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      try {
        // Get documents linked to this project from knowledge hub
        const documents = await knowledgeClient.get(`/documents?projectId=${parent.id}`);
        if (!Array.isArray(documents)) return [];

        // Transform to ProjectDocument format
        const projectDocuments = await Promise.all(
          documents.map(async (doc: ServiceRecord) => {
            let uploadedBy = null;
            if (doc.createdById || doc.uploadedById) {
              try {
                uploadedBy = await context.loaders.enrichedUser.load(
                  String(doc.createdById || doc.uploadedById)
                );
              } catch { /* ignore */ }
            }
            return {
              id: doc.id,
              name: doc.title || doc.name,
              url: doc.url || doc.filePath || `/api/documents/${doc.id}`,
              size: doc.size || doc.fileSize || null,
              fileType: doc.fileType || doc.mimeType || 'unknown',
              uploadedAt: doc.createdAt || doc.uploadedAt,
              uploadedById: doc.createdById || doc.uploadedById,
              uploadedBy,
              projectId: parent.id,
            };
          })
        );
        return projectDocuments;
      } catch {
        return [];
      }
    },
    risks: async (parent: ServiceRecord) => {
      try {
        return await projectClient.get(`/risk-register?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    riskQualityMetrics: async (parent: ServiceRecord) => {
      try {
        return await projectClient.getById('/risk-quality-metrics', parent.id);
      } catch {
        return null;
      }
    },
  },

  Task: {
    priority: (parent: ServiceRecord) => normalizeTaskPriorityForGraphQL(parent.priority),
    assignees: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      // If there's an assigneeId, return that user as a single-element array
      if (parent.assigneeId) {
        const user = await context.loaders.enrichedUser.load(parent.assigneeId);
        return user ? [user] : [];
      }
      return [];
    },
    creator: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.creatorId) return null;
      return context.loaders.enrichedUser.load(parent.creatorId);
    },
    submissions: async (parent: ServiceRecord) => {
      if (Array.isArray(parent.submissions)) return parent.submissions;
      if (!parent.id) return [];
      try {
        return await projectClient.get(`/task-submissions?taskId=${parent.id}`);
      } catch {
        return [];
      }
    },
    checklists: async (parent: ServiceRecord) => {
      if (Array.isArray(parent.checklists)) return parent.checklists;
      if (!parent.id) return [];
      try {
        const task = await projectClient.getById('/tasks', parent.id);
        if (task && Array.isArray((task as ServiceRecord).checklists)) {
          return (task as ServiceRecord).checklists;
        }
        return [];
      } catch {
        return [];
      }
    },
  },

  Milestone: {
    name: (parent: ServiceRecord) => parent.name ?? parent.title,
    completed: (parent: ServiceRecord) =>
      Boolean(parent.completed) ||
      String(parent.status ?? "").toLowerCase() === "completed" ||
      String(parent.status ?? "").toUpperCase() === "COMPLETED",
    completedAt: (parent: ServiceRecord) => parent.completedAt ?? null,
    dueDate: (parent: ServiceRecord) => parent.dueDate ?? new Date(),
    dependencies: (parent: ServiceRecord) =>
      Array.isArray(parent.dependencies) ? parent.dependencies : [],
  },

  MilestoneDependency: {
    dependsOn: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (parent.dependsOn && typeof parent.dependsOn === "object") return parent.dependsOn;
      if (!parent.dependsOnId) return null;
      try {
        return await projectClient.getById("/milestones", parent.dependsOnId);
      } catch {
        return null;
      }
    },
  },

  Client: {
    email: (parent: ServiceRecord) => parent.email ?? parent.contactInfo?.email ?? null,
    company: (parent: ServiceRecord) => parent.company ?? parent.contactInfo?.company ?? null,
    phone: (parent: ServiceRecord) => parent.phone ?? parent.contactInfo?.phone ?? null,
    address: (parent: ServiceRecord) => parent.address ?? parent.contactInfo?.address ?? null,
    industry: (parent: ServiceRecord) => parent.industry ?? null,
    status: (parent: ServiceRecord) => {
      const raw = parent.status;
      if (raw == null || raw === '') {
        return 'Active';
      }
      const lower = String(raw).toLowerCase();
      if (lower === 'active') {
        return 'Active';
      }
      return raw;
    },
    rating: async (parent: ServiceRecord) => {
      try {
        // Calculate rating from client feedback
        const feedbacks = await clientMgmtClient.get(`/client-feedback?clientId=${parent.id}`);
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
          return null;
        }
        const ratings = feedbacks.filter((f: ServiceRecord) => f.rating != null);
        if (ratings.length === 0) return null;
        const avgRating = ratings.reduce((sum: number, f: ServiceRecord) => sum + f.rating, 0) / ratings.length;
        return {
          budget: avgRating,
          communication: avgRating,
          schedule: avgRating,
          overall: avgRating,
        };
      } catch {
        return null;
      }
    },
    projects: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      try {
        const projectClients = await clientMgmtClient.get(`/project-clients?clientId=${parent.id}`);
        if (!Array.isArray(projectClients) || projectClients.length === 0) return [];
        const projects = await Promise.all(
          projectClients.map((pc: ServiceRecord) =>
            context.loaders.projectById.load(pc.projectId).catch(() => null)
          )
        );
        return projects.filter(Boolean);
      } catch {
        return [];
      }
    },
    contracts: async () => {
      // Contracts are not implemented yet - return empty array
      return [];
    },
    contactPerson: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.contactPersonId) return null;
      return context.loaders.enrichedUser.load(parent.contactPersonId);
    },
  },

  // User resolver to handle enrichment for any User type returned
  User: {
    role: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      // If role is explicitly provided and is not 'member' (team fallback), use it
      if (parent.role && parent.role !== 'member') return parent.role;
      try {
        const memberships = await context.loaders.organizationMembersByUserId.load(parent.id);
        if (memberships.length > 0 && memberships[0].roleId) {
          const role = await context.loaders.authRoleById.load(memberships[0].roleId);
          if (role?.name) return role.name;
        }
      } catch {
        // ignore
      }
      return parent.role ?? 'Contributor';
    },
    avatar: (parent: ServiceRecord) => parent.avatar ?? parent.avatarUrl ?? null,
    status: (parent: ServiceRecord) => parent.status ?? 'active',
    skills: (parent: ServiceRecord) => parent.skills ?? [],
    teamId: (parent: ServiceRecord) => parent.teamId ?? null,
    joinedAt: (parent: ServiceRecord) => parent.joinedAt ?? parent.createdAt,
    permissions: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (parent.permissions) return parent.permissions;

      try {
        const memberships = await context.loaders.organizationMembersByUserId.load(parent.id);
        if (memberships.length > 0 && memberships[0].roleId) {
          const role = await context.loaders.authRoleById.load(memberships[0].roleId);
          return role?.permissions ?? null;
        }
      } catch {
        // ignore
      }
      return null;
    },
    team: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      const teamId = parent.teamId;
      if (!teamId) {
        try {
          const teamMembers = await context.loaders.teamMembersByUserId.load(parent.id);
          if (teamMembers.length > 0) {
            return await context.loaders.teamById.load(teamMembers[0].teamId);
          }
        } catch {
          return null;
        }
        return null;
      }
      try {
        return await context.loaders.teamById.load(teamId);
      } catch {
        return null;
      }
    },
  },

  AuthUser: {
    skills: async (parent: ServiceRecord) => {
      const fromProfile = parent.professionalProfile as { skillTags?: string[] } | undefined;
      if (Array.isArray(fromProfile?.skillTags) && fromProfile.skillTags.length > 0) {
        return fromProfile.skillTags;
      }
      if (Array.isArray(parent.skills) && parent.skills.length > 0) {
        return parent.skills;
      }
      try {
        const userSkills = await workforceClient.get(
          `/user-skills?userId=${encodeURIComponent(String(parent.id))}`,
        );
        return Array.isArray(userSkills)
          ? userSkills.map((s: ServiceRecord) => s.skillName).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    },
    professionalProfile: (parent: ServiceRecord) => parent.professionalProfile ?? null,
  },

  ActivityItem: {
    user: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (!parent.userId) return null;
      try {
        return await context.loaders.enrichedUser.load(parent.userId);
      } catch {
        return null;
      }
    },
    project: async (parent: ServiceRecord, _args: unknown, context: Context) => {
      if (parent.project) return parent.project;
      if (!parent.projectId) return null;
      try {
        return await context.loaders.projectById.load(parent.projectId);
      } catch {
        return null;
      }
    },
  },

  Mutation: {
    // Authentication
    login: async (_: unknown, { email, password, turnstileToken }: { email: string; password: string; turnstileToken: string }, context: Context) => {
      const ip = (Array.isArray(context.headers['x-forwarded-for'])
        ? context.headers['x-forwarded-for'][0]
        : context.headers['x-forwarded-for']) || '';

      const isValid = await verifyTurnstileToken(turnstileToken, ip);
      if (!isValid) {
        throw new GraphQLError('Invalid CAPTCHA verification. Please try again.', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      return authClient.post('/auth/login', { email, password });
    },
    register: async (_: unknown, { name, email, password, organizationName, turnstileToken }: { name: string; email: string; password: string; organizationName?: string; turnstileToken: string }, context: Context) => {
      const ip = (Array.isArray(context.headers['x-forwarded-for'])
        ? context.headers['x-forwarded-for'][0]
        : context.headers['x-forwarded-for']) || '';

      const isValid = await verifyTurnstileToken(turnstileToken, ip);
      if (!isValid) {
        throw new GraphQLError('Invalid CAPTCHA verification. Please try again.', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      return authClient.post('/auth/register', { name, email, password, organizationName });
    },
    googleLogin: async (_: unknown, { idToken }: { idToken: string }) => {
      return authClient.post('/auth/google', { idToken });
    },
    googleSignup: async (_: unknown, { idToken }: { idToken: string }) => {
      return authClient.post('/auth/google', { idToken });
    },
    refreshToken: async (_: unknown, { refreshToken }: { refreshToken: string }) => {
      return authClient.post('/auth/refresh', { refreshToken });
    },
    logout: async (_: unknown, _args: unknown, context: Context) => {
      if (!context.token) {
        return true;
      }
      return authClient.postWithAuth('/auth/logout', {}, context.token);
    },

    // Accept invitation and complete onboarding
    acceptInvite: async (_: unknown, { token, password, name, role }: { token: string; password: string; name: string; role?: string }) => {
      let inviteMeta: ServiceRecord | null = null;
      try {
        const raw = await authClient.get(`/auth/invite-details/${encodeURIComponent(token)}`);
        inviteMeta = (Array.isArray(raw) ? raw[0] : raw) as ServiceRecord;
      } catch {
        // accept-invite will validate the token
      }

      const result = (await authClient.post('/auth/accept-invite', {
        token,
        password,
        name,
        role,
      })) as ServiceRecord;

      const acceptedUser = result?.user as ServiceRecord | undefined;
      // Prefer invite metadata when present; otherwise use accept-invite response so client CRM
      // updates still run if invite-details prefetch failed or onboarding URL omitted role.
      const invRole = String(
        inviteMeta?.role ?? acceptedUser?.role ?? role ?? '',
      ).toLowerCase();
      const orgId =
        (typeof inviteMeta?.organizationId === 'string' && inviteMeta.organizationId) ||
        (typeof acceptedUser?.organizationId === 'string' && acceptedUser.organizationId) ||
        (typeof acceptedUser?.organization?.id === 'string' && acceptedUser.organization.id) ||
        undefined;
      const email =
        (typeof inviteMeta?.email === 'string' && inviteMeta.email) ||
        (typeof acceptedUser?.email === 'string' && acceptedUser.email) ||
        undefined;

      if (invRole === 'client' && orgId && email) {
        try {
          const clients = await clientMgmtClient.get(
            `/clients?organizationId=${encodeURIComponent(orgId)}`,
          );
          const list = Array.isArray(clients) ? clients : [];
          const normalized = email.trim().toLowerCase();
          const match = list.find(
            (c: ServiceRecord) =>
              typeof c.email === 'string' &&
              c.email.trim().toLowerCase() === normalized,
          );
          if (match?.id) {
            const pu =
              typeof acceptedUser?.id === 'string' && acceptedUser.id.trim()
                ? acceptedUser.id.trim()
                : undefined;
            await clientMgmtClient.put('/clients', match.id, {
              status: 'Active',
              ...(pu ? { portalUserId: pu } : {}),
            });
            if (pu && orgId) {
              const links = await clientMgmtClient
                .get(`/project-clients?clientId=${encodeURIComponent(match.id)}`)
                .catch(() => [] as ServiceRecord[]);
              const pclist = Array.isArray(links) ? links : [];
              for (const pc of pclist) {
                if (typeof pc.projectId === 'string') {
                  try {
                    await syncClientOrganizerHubParticipants({
                      organizationId: orgId,
                      clientId: match.id,
                      projectId: pc.projectId,
                    });
                  } catch (hubErr) {
                    console.error('[acceptInvite] client–organizer hub sync:', hubErr);
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('[acceptInvite] Failed to activate client record after onboarding:', e);
        }
      }

      return result;
    },

    updateMyProfessionalProfile: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          skillTags: string[];
          experiences: Array<{
            id?: string | null;
            title?: string | null;
            description: string;
            organization?: string | null;
            seniority: string;
            durationMonths?: number | null;
            durationLabel?: string | null;
            startDate?: string | null;
            endDate?: string | null;
            isCurrent?: boolean | null;
          }>;
        };
      },
      context: Context,
    ) => {
      const user = await requireAuth(context);
      if (!context.token) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED', statusCode: 401 },
        });
      }

      const roleName = String(user.role || '').toLowerCase();
      if (roleName === 'organizer' || roleName === 'client') {
        throw new GraphQLError(
          'Professional profile can only be edited by managers and contributors.',
          {
            extensions: { code: 'FORBIDDEN', statusCode: 403 },
          },
        );
      }

      const ALLOWED_SENIORITY = new Set([
        'intern',
        'junior',
        'mid',
        'senior',
        'lead',
        'principal',
        'executive',
      ]);

      const skillTags = [
        ...new Set(
          (input.skillTags || [])
            .map((s) => String(s).trim().toLowerCase())
            .filter(Boolean),
        ),
      ].slice(0, 80);

      const experiences = (input.experiences || []).slice(0, 25).map((ex, idx) => {
        const seniority = String(ex.seniority || '').trim().toLowerCase();
        if (!ALLOWED_SENIORITY.has(seniority)) {
          throw new GraphQLError(
            `Invalid seniority "${ex.seniority}". Use: intern, junior, mid, senior, lead, principal, executive.`,
            {
              extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
            },
          );
        }
        const description = String(ex.description || '').trim();
        if (!description || description.length > 4000) {
          throw new GraphQLError('Each experience requires a description (1–4000 characters).', {
            extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
          });
        }
        const id =
          typeof ex.id === 'string' && ex.id.trim().length > 0
            ? ex.id.trim()
            : randomUUID();
        return {
          id,
          ...(ex.title ? { title: String(ex.title).trim().slice(0, 200) } : {}),
          description,
          ...(ex.organization
            ? { organization: String(ex.organization).trim().slice(0, 200) }
            : {}),
          seniority,
          durationMonths:
            typeof ex.durationMonths === 'number' &&
            Number.isFinite(ex.durationMonths) &&
            ex.durationMonths >= 0
              ? Math.min(600, Math.floor(ex.durationMonths))
              : null,
          ...(ex.durationLabel
            ? { durationLabel: String(ex.durationLabel).trim().slice(0, 120) }
            : {}),
          ...(ex.startDate ? { startDate: String(ex.startDate).trim().slice(0, 32) } : {}),
          ...(ex.endDate ? { endDate: String(ex.endDate).trim().slice(0, 32) } : {}),
          isCurrent: Boolean(ex.isCurrent),
          sortOrder: idx,
        };
      });

      const doc = {
        version: 1,
        skillTags,
        experiences,
        updatedAt: new Date().toISOString(),
      };

      await authClient.put('/users', user.id, { professionalProfile: doc });

      try {
        const existing = await workforceClient.get(
          `/user-skills?userId=${encodeURIComponent(user.id)}`,
        );
        if (Array.isArray(existing)) {
          for (const row of existing) {
            if (row?.id) {
              await workforceClient.delete('/user-skills', row.id);
            }
          }
        }
        for (const tag of skillTags) {
          await workforceClient.post('/user-skills', {
            userId: user.id,
            skillName: tag,
            proficiency: null,
          });
        }
      } catch (e) {
        console.error('[updateMyProfessionalProfile] workforce skill sync failed:', e);
      }

      const rawOrg = context.headers['x-organization-id'];
      const organizationId =
        typeof rawOrg === 'string'
          ? rawOrg.trim()
          : Array.isArray(rawOrg)
            ? String(rawOrg[0] ?? '').trim()
            : undefined;

      return authClient.postWithAuth(
        '/auth/me',
        { organizationId: organizationId || undefined },
        context.token,
        organizationId,
      );
    },

    /**
     * Delete the currently authenticated user's account and all associated data.
     * If the user is an Admin (organizer) of an organization, the entire organization
     * and all its data (including other members) will be deleted.
     */
    deleteMyAccount: async (_: unknown, _args: unknown, context: Context) => {
      // Require authentication
      const user = await requireAuth(context);
      const userId = user.id;

      console.log(`[deleteMyAccount] Starting account deletion for user: ${userId}`);

      try {
        // Check if user is an Admin/Owner of any organization
        const userMemberships = await authClient.get(`/organization-members?userId=${userId}`);
        const organizationsToDelete: string[] = [];
        const organizationMemberIds: string[] = [];

        if (Array.isArray(userMemberships)) {
          for (const membership of userMemberships) {
            // Get the role to check if user is Admin
            if (membership.roleId) {
              try {
                const role = await authClient.getById('/roles', membership.roleId);
                if (role && role.name === 'Organizer' && role.isSystem === true) {
                  // User is the Admin/Owner of this organization
                  organizationsToDelete.push(membership.organizationId);
                }
              } catch (error) {
                console.error('[deleteMyAccount] Error fetching role:', error);
              }
            }
          }
        }

        // If user is an organization owner, delete all organization data first
        for (const orgId of organizationsToDelete) {
          console.log(`[deleteMyAccount] Deleting organization and all data: ${orgId}`);

          // Get all members of this organization (to delete their cross-service data)
          const orgMembers = await authClient.get(`/organization-members?organizationId=${orgId}`);
          if (Array.isArray(orgMembers)) {
            for (const member of orgMembers) {
              if (member.userId !== userId) {
                // Delete cross-service data for each member
                await deleteUserCrossServiceData(member.userId);
              }
              organizationMemberIds.push(member.id);
            }
          }

          // Delete all teams in the organization
          try {
            const teams = await workforceClient.get(`/teams?organizationId=${orgId}`);
            if (Array.isArray(teams)) {
              for (const team of teams) {
                // Delete team members first
                const teamMembers = await workforceClient.get(`/team-members?teamId=${team.id}`);
                if (Array.isArray(teamMembers)) {
                  for (const tm of teamMembers) {
                    await workforceClient.delete('/team-members', tm.id);
                  }
                }
                await workforceClient.delete('/teams', team.id);
              }
            }
          } catch (error) {
            console.error('[deleteMyAccount] Error deleting teams:', error);
          }

          // Delete all projects in the organization
          try {
            const projects = await projectClient.get(`/projects?organizationId=${orgId}`);
            if (Array.isArray(projects)) {
              for (const project of projects) {
                // Delete project members
                const projectMembers = await projectClient.get(`/project-members?projectId=${project.id}`);
                if (Array.isArray(projectMembers)) {
                  for (const pm of projectMembers) {
                    await projectClient.delete('/project-members', pm.id);
                  }
                }
                // Delete tasks
                const tasks = await projectClient.get(`/tasks?projectId=${project.id}`);
                if (Array.isArray(tasks)) {
                  for (const task of tasks) {
                    await projectClient.delete('/tasks', task.id);
                  }
                }
                // Delete milestones
                const milestones = await projectClient.get(`/milestones?projectId=${project.id}`);
                if (Array.isArray(milestones)) {
                  for (const milestone of milestones) {
                    await projectClient.delete('/milestones', milestone.id);
                  }
                }
                await projectClient.delete('/projects', project.id);
              }
            }
          } catch (error) {
            console.error('[deleteMyAccount] Error deleting projects:', error);
          }

          // Delete all clients in the organization
          try {
            const clients = await clientMgmtClient.get(`/clients?organizationId=${orgId}`);
            if (Array.isArray(clients)) {
              for (const client of clients) {
                await clientMgmtClient.delete('/clients', client.id);
              }
            }
          } catch (error) {
            console.error('[deleteMyAccount] Error deleting clients:', error);
          }

          // Delete all documents in the organization
          try {
            const documents = await knowledgeClient.get(`/documents?organizationId=${orgId}`);
            if (Array.isArray(documents)) {
              for (const doc of documents) {
                await knowledgeClient.delete('/documents', doc.id);
              }
            }
            const folders = await knowledgeClient.get(`/document-folders?organizationId=${orgId}`);
            if (Array.isArray(folders)) {
              for (const folder of folders) {
                await knowledgeClient.delete('/document-folders', folder.id);
              }
            }
          } catch (error) {
            console.error('[deleteMyAccount] Error deleting documents:', error);
          }

          // Delete organization members
          for (const memberId of organizationMemberIds) {
            try {
              await authClient.delete('/organization-members', memberId);
            } catch (error) {
              console.error('[deleteMyAccount] Error deleting org member:', error);
            }
          }

          // Delete organization roles (skip system roles which cannot be deleted)
          try {
            const roles = await authClient.get(`/roles?organizationId=${orgId}`);
            if (Array.isArray(roles)) {
              for (const role of roles) {
                if (role.isSystem) continue;
                await authClient.delete('/roles', role.id);
              }
            }
          } catch (error) {
            console.error('[deleteMyAccount] Error deleting roles:', error);
          }

          // Delete the organization itself
          try {
            await authClient.delete('/organizations', orgId);
          } catch (error) {
            console.error('[deleteMyAccount] Error deleting organization:', error);
          }

          // Delete other users in the organization (they are now orphaned)
          if (Array.isArray(orgMembers)) {
            for (const member of orgMembers) {
              if (member.userId !== userId) {
                try {
                  await authClient.delete('/users', member.userId);
                } catch (error) {
                  console.error('[deleteMyAccount] Error deleting org member user:', error);
                }
              }
            }
          }
        }

        // Clean up current user's cross-service data
        await deleteUserCrossServiceData(userId);

        // Delete the requesting user from auth service
        await authClient.delete('/users', userId);

        console.log(`[deleteMyAccount] Successfully deleted user: ${userId}`);
        return true;
      } catch (error) {
        console.error('[deleteMyAccount] Failed to delete user:', error);
        throw new GraphQLError('Failed to delete account. Please try again or contact support.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        });
      }
    },


    // Users & Organizations (Auth Service)
    createUser: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      // Only Organizers can create users
      const currentUser = await requirePermission(context, 'users', 'create');

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return authClient.post('/users', input);
    },
    updateUser: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'users', 'update');
      const payload: ServiceRecord = { ...input };
      // Auth DB column is `avatarUrl`; clients send `avatar` (matches GraphQL User.avatar)
      if (payload.avatar !== undefined && payload.avatarUrl === undefined) {
        payload.avatarUrl = payload.avatar;
        delete payload.avatar;
      }
      return authClient.put('/users', id, payload);
    },
    updateUserRole: async (_: unknown, { userId, role }: { userId: string; role: string }, context: Context) => {
      const currentUser = await requireOrganizer(context);
      const organizationId = currentUser.organizationId;

      if (!organizationId) {
        throw new GraphQLError('Organization ID is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      // Find the user's organization membership
      const memberships = await authClient.get(`/organization-members?userId=${userId}&organizationId=${organizationId}`);
      if (!Array.isArray(memberships) || memberships.length === 0) {
        throw new GraphQLError('User is not a member of this organization', {
          extensions: { code: 'NOT_FOUND', statusCode: 404 },
        });
      }
      const membership = memberships[0];

      // Find or create the role
      const roles = await authClient.get(`/roles?organizationId=${organizationId}`);
      let targetRole = Array.isArray(roles)
        ? roles.find((r: ServiceRecord) => r.name.toLowerCase() === role.toLowerCase())
        : null;

      if (!targetRole) {
        // Role doesn't exist - create it with predefined permissions
        const rolePermissions: Record<string, Record<string, string[]>> = {
          organizer: {
            users: ['create', 'read', 'update', 'delete', 'assign'],
            teams: ['create', 'read', 'update', 'delete', 'assign'],
            projects: ['create', 'read', 'update', 'delete', 'assign'],
            tasks: ['create', 'read', 'update', 'delete', 'assign'],
            clients: ['create', 'read', 'update', 'delete'],
            wiki: ['create', 'read', 'update', 'delete'],
            channels: ['create', 'read', 'update', 'delete'],
            settings: ['read', 'update'],
            reports: ['create', 'read', 'update', 'delete'],
            notifications: ['create', 'read', 'update', 'delete'],
            _meta: ['manage_permissions', 'pause_contributors'],
          },
          manager: {
            users: ['read'],
            teams: ['read', 'update'],
            projects: ['read', 'update'],
            tasks: ['create', 'read', 'update', 'assign'],
            clients: ['read'],
            wiki: ['create', 'read', 'update'],
            channels: ['create', 'read', 'update'],
            settings: ['read'],
            reports: ['read'],
            notifications: ['read', 'update'],
            _meta: [],
          },
          contributor: {
            users: ['read'],
            teams: ['read'],
            projects: ['read'],
            tasks: ['read', 'update'],
            clients: [],
            wiki: ['read'],
            channels: ['read', 'update'],
            settings: [],
            reports: ['read'],
            notifications: ['read', 'update'],
            _meta: [],
          },
        };

        const normalizedRoleName = role.toLowerCase();
        const permissions = rolePermissions[normalizedRoleName];

        if (permissions) {
          const displayName = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
          targetRole = await authClient.post('/roles', {
            organizationId,
            name: displayName,
            permissions,
            isSystem: true,
          });
        } else {
          throw new GraphQLError(`Unknown role: ${role}. Valid roles are: Organizer, Manager, Contributor`, {
            extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
          });
        }
      }

      // Update the organization membership with the new role
      await authClient.put('/organization-members', membership.id, {
        roleId: targetRole.id,
      });

      // Return the updated user with the new role
      const user = await authClient.getById('/users', userId);

      try {
        const currentUserData = await authClient.getById('/users', currentUser.id);
        const inviterName = `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || currentUser.email;
        let organizationName = 'our organization';
        try {
          const org = await authClient.getById('/organizations', organizationId);
          if (org?.name) organizationName = org.name;
        } catch { /* ignore */ }

        const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const roleEmailLogoUrl =
          process.env.VISTONE_EMAIL_LOGO_URL?.trim() ||
          `${frontendBase}/logo-dark.svg`;

        await notificationClient.postWithAuth('/emails/send', {
          to: user.email,
          subject: `Your role has been updated on Vistone`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #eef2f8;">
              <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                <img src="${roleEmailLogoUrl}" alt="Vistone" width="160" height="160" style="height: 36px; width: auto; max-width: 180px; display: inline-block; margin: 0 auto 16px; border: 0;" />
                <h2 style="color: #0f172a; margin-top: 0;">Role Update 🔄</h2>
                <p style="color: #64748b; font-size: 16px;">Hi ${user.firstName || ''},</p>
                <p style="color: #64748b; font-size: 16px;">
                  <strong>${inviterName}</strong> has updated your role in <strong>${organizationName}</strong> to <strong>${targetRole.name}</strong>.
                </p>
              </div>
            </div>
          `
        }, context.token!, organizationId);
      } catch (err) {
        console.error("Failed to send role update notification:", err);
      }

      return {
        ...user,
        role: targetRole.name,
      };
    },
    deleteUser: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'users', 'delete');
      return authClient.delete('/users', id);
    },
    inviteMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requirePermission(context, 'users', 'create');

      // Use organizationId from input or current user
      const organizationId = input.organizationId || currentUser.organizationId;
      if (!organizationId) {
        throw new GraphQLError('Organization ID is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      // Get organization details for the email
      let organization;
      try {
        organization = await authClient.getById('/organizations', organizationId);
      } catch {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND', statusCode: 404 },
        });
      }

      // Create user if doesn't exist, or get existing user
      let user;
      try {
        // Try to find existing user by email (indexed lookup, not full user table)
        const byEmail = await authClient.get(
          `/users?email=${encodeURIComponent(input.email)}`
        );
        user = Array.isArray(byEmail) && byEmail.length > 0 ? byEmail[0] : null;

        if (!user) {
          // Create new user with pending status
          user = await authClient.post('/users', {
            email: input.email,
            firstName: input.firstName || '',
            lastName: input.lastName || '',
            jobTitle: input.jobTitle || '',
            status: 'pending',
          });
        }
      } catch {
        throw new GraphQLError('Failed to create or find user. The email address may be invalid or the service is unavailable.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        });
      }

      // Look up the role by name for this organization, or create it if needed
      let roleId: string | null = null;
      if (input.role) {
        try {
          const roles = await authClient.get(`/roles?organizationId=${organizationId}`);
          const matchingRole = Array.isArray(roles)
            ? roles.find((r: ServiceRecord) => r.name.toLowerCase() === input.role.toLowerCase())
            : null;

          if (matchingRole) {
            roleId = matchingRole.id;
          } else {
            // Role doesn't exist - create it with predefined permissions
            const rolePermissions: Record<string, Record<string, string[]>> = {
              manager: {
                users: ['read'],
                teams: ['read', 'update'],
                projects: ['read', 'update'],
                tasks: ['create', 'read', 'update', 'assign'],
                clients: ['read'],
                wiki: ['create', 'read', 'update'],
                channels: ['create', 'read', 'update'],
                settings: ['read'],
                reports: ['read'],
                notifications: ['read', 'update'],
              },
              contributor: {
                users: ['read'],
                teams: ['read'],
                projects: ['read'],
                tasks: ['read', 'update'],
                clients: [],
                wiki: ['read'],
                channels: ['read', 'update'],
                settings: [],
                reports: ['read'],
                notifications: ['read', 'update'],
              },
              client: {
                users: [],
                teams: [],
                projects: ['read'],
                tasks: ['read'],
                clients: [],
                wiki: ['read'],
                channels: ['read', 'update'],
                settings: [],
                reports: ['read'],
                notifications: ['read'],
              },
            };

            const normalizedRoleName = input.role.toLowerCase();
            const permissions = rolePermissions[normalizedRoleName];

            if (permissions) {
              // Create the role for this organization
              const displayName = input.role.charAt(0).toUpperCase() + input.role.slice(1).toLowerCase();
              try {
                const newRole = await authClient.post('/roles', {
                  organizationId,
                  name: displayName,
                  permissions,
                  isSystem: true,
                });
                roleId = newRole.id;
                console.log(`Created new role "${displayName}" for org ${organizationId}`);
              } catch (createRoleError) {
                console.error('Failed to create role:', createRoleError);
              }
            } else {
              console.warn(`Unknown role "${input.role}" - no permissions defined, using null roleId`);
            }
          }
        } catch (roleError) {
          console.error('Error looking up role:', roleError);
          // Continue with null roleId if role lookup fails
        }
      }

      const existingMemberships = await authClient.get(
        `/organization-members?userId=${encodeURIComponent(user.id)}&organizationId=${encodeURIComponent(organizationId)}`,
      );
      const membershipList = Array.isArray(existingMemberships) ? existingMemberships : [];
      if (membershipList.length > 0) {
        throw new GraphQLError('This email is already part of your organization.', {
          extensions: { code: 'CONFLICT', statusCode: 409 },
        });
      }

      // Reserve invitation first (auth service enforces no duplicate pending / member email)
      let inviteToken = '';
      try {
        const invData = await authClient.post('/auth/invitations', {
          email: input.email,
          role: input.role,
          organizationId,
        });
        if (invData && invData.token) {
          inviteToken = invData.token;
        } else {
          throw new GraphQLError('No token returned from auth service', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
          });
        }
      } catch (invErr) {
        if (invErr instanceof ServiceError && invErr.statusCode === 409) {
          throw new GraphQLError(invErr.message, {
            extensions: { code: 'CONFLICT', statusCode: 409 },
          });
        }
        console.error('Failed to create invitation record:', invErr);
        throw new GraphQLError('Failed to generate secure invitation token. Please try again.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        });
      }

      try {
        await authClient.post('/organization-members', {
          userId: user.id,
          organizationId,
          roleId, // Use the resolved roleId from input.role
        });
      } catch (memberErr) {
        if (memberErr instanceof ServiceError && memberErr.statusCode === 409) {
          throw new GraphQLError(memberErr.message, {
            extensions: { code: 'CONFLICT', statusCode: 409 },
          });
        }
        throw memberErr;
      }

      // If teamId provided, add user to team
      let teamName;
      if (input.teamId) {
        try {
          const team = await workforceClient.getById('/teams', input.teamId);
          teamName = team?.name;

          await workforceClient.post('/team-members', {
            teamId: input.teamId,
            userId: user.id,
            role: input.role || 'member',
          });
        } catch {
          // Team membership might already exist
        }
      }

      // Send invitation email
      try {
        const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        const recipientName = `${input.firstName || ''} ${input.lastName || ''}`.trim() || undefined;

        if (input.teamId && teamName) {
          // Send team invitation
          await notificationClient.postWithAuth('/emails/invite/team', {
            email: input.email,
            inviterName,
            teamName,
            organizationName: organization.name,
            inviteToken,
            recipientName,
            role: input.jobTitle || input.role,
          }, context.token!, organizationId);
        } else {
          // Send organization invitation
          await notificationClient.postWithAuth('/emails/invite/organization', {
            email: input.email,
            inviterName,
            organizationName: organization.name,
            inviteToken,
            recipientName,
            role: input.jobTitle || input.role,
          }, context.token!, organizationId);
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the entire operation if email fails
      }

      return enrichUserWithWorkforceData(user);
    },
    createOrganization: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireOrganizer(context);
      return authClient.post('/organizations', input);
    },
    updateOrganization: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'settings', 'update');
      return authClient.put('/organizations', id, input);
    },
    deleteOrganization: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireOrganizer(context);
      return authClient.delete('/organizations', id);
    },
    createOrganizationMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireOrganizer(context);
      return authClient.post('/organization-members', input);
    },
    updateOrganizationMember: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireOrganizer(context);
      return authClient.put('/organization-members', id, input);
    },
    deleteOrganizationMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireOrganizer(context);
      return authClient.delete('/organization-members', id);
    },
    createRole: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireOrganizer(context);
      return authClient.post('/roles', input);
    },
    updateRole: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireOrganizer(context);
      return authClient.put('/roles', id, input);
    },
    deleteRole: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireOrganizer(context);
      return authClient.delete('/roles', id);
    },
    initializeRoles: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganizer(context);
      return authClient.post(`/roles/initialize/${organizationId}`, {});
    },
    createKycData: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'settings', 'update');
      return authClient.post('/kyc-data', input);
    },
    updateKycData: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'settings', 'update');
      return authClient.put('/kyc-data', id, input);
    },
    deleteKycData: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireOrganizer(context);
      return authClient.delete('/kyc-data', id);
    },
    createMfaSetting: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return authClient.post('/mfa-settings', input);
    },
    updateMfaSetting: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return authClient.put('/mfa-settings', id, input);
    },
    deleteMfaSetting: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return authClient.delete('/mfa-settings', id);
    },
    createActivityLog: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const me = await requireAuth(context);
      const actorId =
        input.userId && input.userId !== me.id && isOrganizer(me)
          ? String(input.userId)
          : me.id;
      return authClient.post('/activity-logs', {
        ...input,
        userId: actorId,
      });
    },

    // RBAC Management
    pauseUser: async (_: unknown, { userId }: { userId: string }, context: Context) => {
      const currentUser = await requireAuth(context);
      const orgId = getOrgId(currentUser);

      // Get target user's membership to check their role
      const memberships = await authClient.get(`/organization-members?userId=${userId}&organizationId=${orgId}`);
      if (!Array.isArray(memberships) || memberships.length === 0) {
        throw new GraphQLError('User is not a member of this organization', {
          extensions: { code: 'NOT_FOUND', statusCode: 404 },
        });
      }
      const targetMembership = memberships[0];
      let targetRoleName = 'Contributor';
      if (targetMembership.roleId) {
        const targetRole = await authClient.getById('/roles', targetMembership.roleId);
        targetRoleName = targetRole?.name || 'Contributor';
      }

      // Organizer can pause anyone
      if (isOrganizer(currentUser)) {
        return authClient.put('/users', userId, { status: 'paused' });
      }

      // Manager can only pause Contributors and only if granted pause_contributors
      if (hasMetaPermission(currentUser, 'pause_contributors') && targetRoleName === 'Contributor') {
        return authClient.put('/users', userId, { status: 'paused' });
      }

      throw new GraphQLError('Forbidden: You do not have permission to pause this user', {
        extensions: { code: 'FORBIDDEN', statusCode: 403 },
      });
    },
    unpauseUser: async (_: unknown, { userId }: { userId: string }, context: Context) => {
      const currentUser = await requireAuth(context);
      const orgId = getOrgId(currentUser);

      const memberships = await authClient.get(`/organization-members?userId=${userId}&organizationId=${orgId}`);
      if (!Array.isArray(memberships) || memberships.length === 0) {
        throw new GraphQLError('User is not a member of this organization', {
          extensions: { code: 'NOT_FOUND', statusCode: 404 },
        });
      }
      const targetMembership = memberships[0];
      let targetRoleName = 'Contributor';
      if (targetMembership.roleId) {
        const targetRole = await authClient.getById('/roles', targetMembership.roleId);
        targetRoleName = targetRole?.name || 'Contributor';
      }

      if (isOrganizer(currentUser)) {
        return authClient.put('/users', userId, { status: 'active' });
      }

      if (hasMetaPermission(currentUser, 'pause_contributors') && targetRoleName === 'Contributor') {
        return authClient.put('/users', userId, { status: 'active' });
      }

      throw new GraphQLError('Forbidden: You do not have permission to unpause this user', {
        extensions: { code: 'FORBIDDEN', statusCode: 403 },
      });
    },
    updateMemberPermissions: async (_: unknown, { userId, permissions }: { userId: string; permissions: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);
      const orgId = getOrgId(currentUser);

      // Get target user's membership
      const memberships = await authClient.get(`/organization-members?userId=${userId}&organizationId=${orgId}`);
      if (!Array.isArray(memberships) || memberships.length === 0) {
        throw new GraphQLError('User is not a member of this organization', {
          extensions: { code: 'NOT_FOUND', statusCode: 404 },
        });
      }
      const targetMembership = memberships[0];
      let targetRoleName = 'Contributor';
      if (targetMembership.roleId) {
        const targetRole = await authClient.getById('/roles', targetMembership.roleId);
        targetRoleName = targetRole?.name || 'Contributor';
      }

      if (isOrganizer(currentUser)) {
        if (targetRoleName === 'Organizer') {
          throw new GraphQLError('Cannot modify another Organizer\'s permissions', {
            extensions: { code: 'FORBIDDEN', statusCode: 403 },
          });
        }
        // Update the role's permissions
        if (targetMembership.roleId) {
          await authClient.put('/roles', targetMembership.roleId, { permissions });
        }
        return authClient.getById('/organization-members', targetMembership.id);
      }

      // Manager can update Contributor permissions only if granted manage_permissions
      if (hasMetaPermission(currentUser, 'manage_permissions') && targetRoleName === 'Contributor') {
        if (targetMembership.roleId) {
          await authClient.put('/roles', targetMembership.roleId, { permissions });
        }
        return authClient.getById('/organization-members', targetMembership.id);
      }

      throw new GraphQLError('Forbidden: You do not have permission to manage this user\'s permissions', {
        extensions: { code: 'FORBIDDEN', statusCode: 403 },
      });
    },

    // Teams - Enhanced
    removeMember: async (_: unknown, { teamId, memberId }: { teamId: string; memberId: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.post('/teams/remove-member', { teamId, memberId });
    },

    // Teams (Workforce Service)
    createTeam: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return workforceClient.post('/teams', input);
    },
    updateTeam: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.put('/teams', id, input);
    },
    deleteTeam: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.delete('/teams', id);
    },
    addTeamMember: async (_: unknown, { teamId, userId }: { teamId: string; userId: string }, context: Context) => {
      const currentUser = await requireAuth(context);
      await workforceClient.post('/team-members', { teamId, userId });
      const team = await workforceClient.getById('/teams', teamId);
      
      try {
        const user = await authClient.getById('/users', userId);
        if (user?.email && team?.name) {
          const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
          let organizationName = 'our organization';
          if (currentUser.organizationId) {
            try {
              const org = await authClient.getById('/organizations', currentUser.organizationId);
              if (org?.name) organizationName = org.name;
            } catch { /* ignore */ }
          }

          await notificationClient.postWithAuth('/emails/invite/team', {
            email: user.email,
            inviterName,
            teamName: team.name,
            organizationName,
            inviteToken: 'internal-add',
            recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
            role: 'Member'
          }, context.token!, currentUser.organizationId || undefined);
        }
      } catch (err) {
        console.error("Failed to send team addition email:", err);
      }

      return team;
    },
    removeTeamMember: async (_: unknown, { teamId, userId }: { teamId: string; userId: string }, context: Context) => {
      await requireAuth(context);
      const teamMembers = await workforceClient.get(`/team-members?teamId=${teamId}&userId=${userId}`);
      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        await workforceClient.delete('/team-members', teamMembers[0].id);
      }
      return workforceClient.getById('/teams', teamId);
    },
    createTeamMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);
      const teamMember = await workforceClient.post('/team-members', input);
      
      try {
        if (input.userId && input.teamId) {
          const user = await authClient.getById('/users', input.userId);
          const team = await workforceClient.getById('/teams', input.teamId);
          if (user?.email && team?.name) {
            const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
            let organizationName = 'our organization';
            if (currentUser.organizationId) {
              try {
                const org = await authClient.getById('/organizations', currentUser.organizationId);
                if (org?.name) organizationName = org.name;
              } catch { /* ignore */ }
            }
  
            await notificationClient.postWithAuth('/emails/invite/team', {
              email: user.email,
              inviterName,
              teamName: team.name,
              organizationName,
              inviteToken: 'internal-add',
              recipientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
              role: input.role || 'Member'
            }, context.token!, currentUser.organizationId || undefined);
          }
        }
      } catch (err) {
        console.error("Failed to send team addition email:", err);
      }
      
      return teamMember;
    },
    updateTeamMember: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.put('/team-members', id, input);
    },
    deleteTeamMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.delete('/team-members', id);
    },
    createUserSkill: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.post('/user-skills', input);
    },
    updateUserSkill: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.put('/user-skills', id, input);
    },
    deleteUserSkill: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.delete('/user-skills', id);
    },
    createUserAvailability: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.post('/user-availability', input);
    },
    updateUserAvailability: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.put('/user-availability', id, input);
    },
    deleteUserAvailability: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.delete('/user-availability', id);
    },
    createAttendanceLog: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      const organizationId = String(input.organizationId || '');
      if (!organizationId) {
        throw new GraphQLError('organizationId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await requireOrganization(context, organizationId);
      const payload: ServiceRecord = {
        organizationId,
        workDate: input.workDate,
        hoursWorked: input.hoursWorked,
        notes: input.notes ?? null,
      };
      return workforceClient.post('/attendance-logs', payload);
    },
    updateAttendanceLog: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return workforceClient.put('/attendance-logs', id, input);
    },
    deleteAttendanceLog: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return workforceClient.delete('/attendance-logs', id);
    },

    // Projects (Project Service)
    createProject: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requirePermission(context, 'projects', 'create');

      const organizationId = input.organizationId || currentUser.organizationId;
      if (!organizationId) {
        throw new GraphQLError('Organization ID is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      const projectData: ServiceRecord = {
        organizationId,
        name: input.name,
        description: input.description || null,
        status: input.status,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        clientId: input.clientId || null,
        managerId: input.managerId || null,
        teamIds: input.teamId ? [input.teamId] : [],
        progress: 0,
        metadata: {
          type: input.type || 'general',
          visibility: input.visibility || 'private',
          notifyTeam: input.notifyTeam ?? false,
          notifyClient: input.notifyClient ?? false,
        },
      };

      const project = await projectClient.post('/projects', projectData);

      if (input.contributors && input.contributors.length > 0) {
        const contributorIds = Array.from(
          new Set(
            input.contributors
              .filter((userId: unknown) => typeof userId === "string")
              .map((userId: string) => userId.trim())
              .filter(Boolean)
          )
        );

        try {
          for (const userId of contributorIds) {
            await projectClient.post('/project-members', {
              projectId: project.id,
              userId,
              role: 'contributor',
            });
          }
        } catch (error) {
          console.error('[createProject] Failed to assign all contributors:', error);
          // Avoid leaving behind a partially configured project.
          await projectClient.delete('/projects', project.id).catch((cleanupError: unknown) => {
            console.error('[createProject] Cleanup failed after contributor assignment error:', cleanupError);
          });
          throw new GraphQLError('Failed to assign project contributors', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
          });
        }
      }

      // Create project-clients link so the client can see this project on their dashboard
      if (input.clientId) {
        try {
          await clientMgmtClient.post('/project-clients', {
            projectId: project.id,
            clientId: input.clientId,
          });
        } catch (error) {
          console.error(`Failed to create project-client link for client ${input.clientId}:`, error);
        }
        try {
          await provisionClientOrganizerWorkspaceHub({
            organizationId,
            projectId: project.id,
            projectName: project.name,
            clientId: input.clientId,
            creatorUserId: currentUser.id,
          });
        } catch (hubErr) {
          console.error(`[createProject] client–organizer hub:`, hubErr);
        }
      }

      // Send notification emails
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const projectLink = `${frontendUrl}/organizer/projects/${project.id}`;
      const organizerName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;

      // Fetch organization name for email context
      let organizationName = 'our organization';
      try {
        const org = await authClient.getById('/organizations', organizationId);
        if (org?.name) organizationName = org.name;
      } catch { /* non-critical */ }

      // Notify team members
      if (input.notifyTeam) {
        try {
          const emailTargets: { email: string; firstName?: string; lastName?: string }[] = [];

          // Team members
          if (input.teamId) {
            const teamMembers = await workforceClient.get(`/team-members?teamId=${input.teamId}`);
            if (Array.isArray(teamMembers)) {
              for (const tm of teamMembers) {
                const u = await authClient.getById('/users', tm.userId).catch(() => null);
                if (u?.email) emailTargets.push({ email: u.email, firstName: u.firstName, lastName: u.lastName });
              }
            }
          }

          // Extra contributors
          if (input.contributors && input.contributors.length > 0) {
            for (const uid of input.contributors) {
              const u = await authClient.getById('/users', uid).catch(() => null);
              if (u?.email && !emailTargets.find(t => t.email === u.email)) {
                emailTargets.push({ email: u.email, firstName: u.firstName, lastName: u.lastName });
              }
            }
          }

          for (const target of emailTargets) {
            try {
              await notificationClient.postWithAuth('/emails/project-assigned', {
                email: target.email,
                recipientName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || undefined,
                organizerName,
                organizationName,
                projectName: project.name,
                projectLink,
                role: 'team',
              }, context.token!, organizationId);
            } catch (e) {
              console.error(`Failed to send project notification to team member ${target.email}:`, e);
            }
          }
        } catch (e) {
          console.error('[createProject] Failed to send team notifications:', e);
        }
      }

      // Notify client
      if (input.notifyClient && input.clientId) {
        try {
          const client = await clientMgmtClient.getById('/clients', input.clientId).catch(() => null);
          if (client?.email) {
            await notificationClient.postWithAuth('/emails/project-assigned', {
              email: client.email,
              recipientName: client.name || undefined,
              organizerName,
              organizationName,
              projectName: project.name,
              projectLink: `${frontendUrl}/client/projects/${project.id}`,
              role: 'client',
            }, context.token!, organizationId);
          }
        } catch (e) {
          console.error('[createProject] Failed to send client notification:', e);
        }
      }

      return project;
    },
    updateProject: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      const currentUser = await requirePermission(context, 'projects', 'update');
      const projectData: ServiceRecord = {};
      if (input.name !== undefined) projectData.name = input.name;
      if (input.description !== undefined) projectData.description = input.description;
      if (input.status !== undefined) projectData.status = input.status;
      if (input.startDate !== undefined) projectData.startDate = input.startDate ? new Date(input.startDate) : null;
      if (input.endDate !== undefined) projectData.endDate = input.endDate ? new Date(input.endDate) : null;
      if (input.clientId !== undefined) projectData.clientId = input.clientId;
      if (input.managerId !== undefined) projectData.managerId = input.managerId;
      if (input.teamId !== undefined) projectData.teamIds = input.teamId ? [input.teamId] : [];
      if (input.progress !== undefined) projectData.progress = input.progress;
      if (input.budget !== undefined) projectData.budget = input.budget;
      if (input.spentBudget !== undefined) projectData.spentBudget = input.spentBudget;
      const needsMetadataMerge =
        input.type !== undefined ||
        input.visibility !== undefined ||
        input.notifyTeam !== undefined ||
        input.notifyClient !== undefined ||
        input.clientCanViewTasks !== undefined ||
        input.clientCanViewMilestones !== undefined ||
        input.taskKanbanStatuses !== undefined;

      if (needsMetadataMerge) {
        const existingProject = await projectClient.getById('/projects', id);
        const existingMetadata =
          existingProject?.metadata && typeof existingProject.metadata === 'object'
            ? { ...(existingProject.metadata as Record<string, unknown>) }
            : {};
        projectData.metadata = {
          ...existingMetadata,
          ...(input.type !== undefined && { type: input.type }),
          ...(input.visibility !== undefined && { visibility: input.visibility }),
          ...(input.notifyTeam !== undefined && { notifyTeam: input.notifyTeam }),
          ...(input.notifyClient !== undefined && { notifyClient: input.notifyClient }),
          ...(input.clientCanViewTasks !== undefined && {
            clientCanViewTasks: input.clientCanViewTasks,
          }),
          ...(input.clientCanViewMilestones !== undefined && {
            clientCanViewMilestones: input.clientCanViewMilestones,
          }),
          ...(Array.isArray(input.taskKanbanStatuses) && {
            taskKanbanStatuses: input.taskKanbanStatuses.filter(
              (s: unknown) => typeof s === 'string' && s.trim().length > 0,
            ),
          }),
        };
      }

      if (input.contributors !== undefined) {
        try {
          const requestedContributorIds = Array.from(
            new Set(
              (Array.isArray(input.contributors) ? input.contributors : [])
                .filter((userId: unknown) => typeof userId === "string")
                .map((userId: string) => userId.trim())
                .filter(Boolean)
            )
          );

          // Get existing members for the project
          const existingMembers = await projectClient.get(`/project-members?projectId=${id}`);
          const existingMemberArray = Array.isArray(existingMembers) ? existingMembers : [];

          // Users that are currently members
          const existingUserIds = existingMemberArray.map((m: any) => m.userId);

          // Determine which to delete
          const membersToDelete = existingMemberArray.filter(
            (m: any) => !requestedContributorIds.includes(m.userId)
          );

          // Determine which to add
          const userIdsToAdd = requestedContributorIds.filter(
            (userId: string) => !existingUserIds.includes(userId)
          );

          // Delete removed members
          for (const member of membersToDelete) {
            await projectClient.delete('/project-members', member.id);
          }

          // Add new members
          for (const userId of userIdsToAdd) {
            await projectClient.post('/project-members', {
              projectId: id,
              userId,
              role: 'contributor'
            });
          }
        } catch (error) {
          console.error('[updateProject] Error updating contributors:', error);
          throw new GraphQLError('Failed to synchronize project contributors', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
          });
        }
      }

      const updated = await projectClient.put('/projects', id, projectData);
      if (input.clientId !== undefined && updated?.clientId) {
        try {
          await clientMgmtClient.post('/project-clients', {
            projectId: id,
            clientId: updated.clientId,
          });
        } catch {
          /* link may already exist */
        }
        const orgId =
          typeof updated.organizationId === 'string' && updated.organizationId
            ? updated.organizationId
            : currentUser.organizationId;
        if (orgId) {
          try {
            await provisionClientOrganizerWorkspaceHub({
              organizationId: orgId,
              projectId: id,
              projectName: updated.name,
              clientId: updated.clientId,
              creatorUserId: currentUser.id,
            });
          } catch (hubErr) {
            console.error('[updateProject] client–organizer hub:', hubErr);
          }
        }
      }
      return updated;
    },
    deleteProject: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'delete');
      return projectClient.delete('/projects', id);
    },
    createProjectMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.post('/project-members', input);
    },
    updateProjectMember: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.put('/project-members', id, input);
    },
    deleteProjectMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.delete('/project-members', id);
    },
    createTask: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'create');
      const task = await projectClient.post('/tasks', input);
      
      // Auto-update project status if Planning
      if (input.projectId) {
        try {
          const project = await projectClient.getById('/projects', input.projectId);
          if (project && project.status === 'Planning') {
            await projectClient.put('/projects', input.projectId, { status: 'In Progress' });
          }
        } catch (e) {
          console.error('Failed to auto-update project status:', e);
        }
      }
      
      return task;
    },
    updateTask: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.put('/tasks', id, input);
    },
    deleteTask: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'delete');
      return projectClient.delete('/tasks', id);
    },
    createTaskChecklist: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.post('/task-checklists', input);
    },
    updateTaskChecklist: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.put('/task-checklists', id, input);
    },
    deleteTaskChecklist: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.delete('/task-checklists', id);
    },
    createTaskDependency: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.post('/task-dependencies', input);
    },
    updateTaskDependency: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.put('/task-dependencies', id, input);
    },
    deleteTaskDependency: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'delete');
      return projectClient.delete('/task-dependencies', id);
    },
    createTaskSubmission: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.post('/task-submissions', input);
    },
    updateTaskSubmission: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.put('/task-submissions', id, input);
    },
    reviewTaskSubmission: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'tasks', 'update');
      return projectClient.post(`/task-submissions/${id}/review`, input);
    },
    createMilestone: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      const milestone = await projectClient.post('/milestones', input);
      
      // Auto-update project status if Planning
      if (input.projectId) {
        try {
          const project = await projectClient.getById('/projects', input.projectId);
          if (project && project.status === 'Planning') {
            await projectClient.put('/projects', input.projectId, { status: 'In Progress' });
          }
        } catch (e) {
          console.error('Failed to auto-update project status:', e);
        }
      }
      
      return milestone;
    },
    updateMilestone: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.put('/milestones', id, input);
    },
    deleteMilestone: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'delete');
      return projectClient.delete('/milestones', id);
    },
    createMilestoneDependency: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.post('/milestone-dependencies', input);
    },
    deleteMilestoneDependency: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.delete('/milestone-dependencies', id);
    },
    replaceMilestoneDependencies: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.post('/milestone-dependencies/replace', input);
    },
    createRiskRegister: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.post('/risk-register', input);
    },
    updateRiskRegister: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.put('/risk-register', id, input);
    },
    deleteRiskRegister: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'delete');
      return projectClient.delete('/risk-register', id);
    },
    updateRiskQualityMetrics: async (
      _: unknown,
      { projectId, input }: { projectId: string; input: ServiceRecord },
      context: Context
    ) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.put('/risk-quality-metrics', projectId, { inputs: input });
    },
    createAiInsight: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.post('/ai-insights', input);
    },
    updateAiInsight: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.put('/ai-insights', id, input);
    },
    deleteAiInsight: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'delete');
      return projectClient.delete('/ai-insights', id);
    },

    // Clients (Client Management Service)
    createClient: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requirePermission(context, 'clients', 'create');
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }
      return clientMgmtClient.post('/clients', input);
    },
    updateClient: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'update');
      return clientMgmtClient.put('/clients', id, input);
    },
    deleteClient: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'delete');
      return clientMgmtClient.delete('/clients', id);
    },

    inviteClient: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requirePermission(context, 'clients', 'create');

      const organizationId = input.organizationId || currentUser.organizationId;
      if (!organizationId) {
        throw new GraphQLError('Organization ID is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      let organization;
      try {
        organization = await authClient.getById('/organizations', organizationId);
      } catch {
        throw new GraphQLError('Organization not found', {
          extensions: { code: 'NOT_FOUND', statusCode: 404 },
        });
      }

      let user;
      try {
        const byEmail = await authClient.get(
          `/users?email=${encodeURIComponent(input.email)}`
        );
        user = Array.isArray(byEmail) && byEmail.length > 0 ? byEmail[0] : null;

        if (!user) {
          const nameParts = input.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          user = await authClient.post('/users', {
            email: input.email,
            firstName,
            lastName,
          });
        }
      } catch {
        throw new GraphQLError('Failed to create or find user. The email address may be invalid or the service is unavailable.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        });
      }

      const existingOrgMemberships = await authClient.get(
        `/organization-members?userId=${encodeURIComponent(user.id)}&organizationId=${encodeURIComponent(organizationId)}`,
      );
      const existingMembershipRows = Array.isArray(existingOrgMemberships)
        ? existingOrgMemberships
        : [];
      if (existingMembershipRows.length > 0) {
        throw new GraphQLError('This email is already part of your organization.', {
          extensions: { code: 'CONFLICT', statusCode: 409 },
        });
      }

      // Find or create 'Client' role
      let roleId: string | null = null;
      try {
        const roles = await authClient.get(`/roles?organizationId=${organizationId}`);
        const matchingRole = Array.isArray(roles)
          ? roles.find((r: ServiceRecord) => r.name.toLowerCase() === 'client')
          : null;

        if (matchingRole) {
          roleId = matchingRole.id;
        } else {
          const newRole = await authClient.post('/roles', {
            organizationId,
            name: 'Client',
            permissions: {
              users: [],
              teams: [],
              projects: ['read'],
              tasks: ['read'],
              clients: [],
              wiki: ['read'],
              channels: ['read', 'update'],
              settings: [],
              reports: ['read'],
              notifications: ['read'],
            },
            isSystem: true,
          });
          roleId = newRole.id;
        }
      } catch (e) {
        console.error('Failed to resolve Client role:', e);
      }

      let inviteToken = '';
      try {
        const invData = await authClient.post('/auth/invitations', {
          email: input.email,
          role: 'Client',
          organizationId,
          senderId: currentUser.id,
        });
        if (invData && invData.token) {
          inviteToken = invData.token;
        } else {
          throw new GraphQLError('No invitation token returned from auth service', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
          });
        }
      } catch (invErr) {
        if (invErr instanceof ServiceError && invErr.statusCode === 409) {
          throw new GraphQLError(invErr.message, {
            extensions: { code: 'CONFLICT', statusCode: 409 },
          });
        }
        console.error('Failed to create invitation record for client:', invErr);
        throw new GraphQLError('Failed to create client invitation. Please try again.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        });
      }

      try {
        await authClient.post('/organization-members', {
          userId: user.id,
          organizationId,
          roleId,
        });
      } catch (memberErr) {
        if (memberErr instanceof ServiceError && memberErr.statusCode === 409) {
          throw new GraphQLError(memberErr.message, {
            extensions: { code: 'CONFLICT', statusCode: 409 },
          });
        }
        throw memberErr;
      }

      let client;
      try {
        const clients = await clientMgmtClient.get('/clients');
        client = clients.find((c: ServiceRecord) => c.email === input.email);

        if (!client) {
          client = await clientMgmtClient.post('/clients', {
            name: input.name,
            email: input.email,
            company: input.company,
            phone: input.phone,
            address: input.address,
            industry: input.industry,
            organizationId,
            portalAccess: true,
            status: 'pending',
            contactPersonId: user.id,
          });
        } else {
          client = await clientMgmtClient.put('/clients', client.id, {
            portalAccess: true,
            contactPersonId: user.id,
            address: input.address,
            industry: input.industry,
            status: 'pending',
          });
        }
      } catch {
        throw new GraphQLError('Failed to create or find client record. Please try again.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        });
      }

      let projectName;
      if (input.projectId) {
        try {
          const project = await projectClient.getById('/projects', input.projectId);
          projectName = project?.name;
          await clientMgmtClient.post('/project-clients', {
            projectId: input.projectId,
            clientId: client.id,
          });
          await ensureProjectWikiLink({
            organizationId,
            projectId: input.projectId,
            projectName: project?.name,
          });
          try {
            await provisionClientOrganizerWorkspaceHub({
              organizationId,
              projectId: input.projectId,
              projectName: project?.name,
              clientId: client.id,
              creatorUserId: currentUser.id,
            });
          } catch (hubErr) {
            console.error('[inviteClientToOrganization] client–organizer hub:', hubErr);
          }
        } catch {
          // Relationship might already exist
        }
      }

      try {
        const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        await notificationClient.postWithAuth('/emails/invite/client', {
          email: input.email,
          inviterName,
          organizationName: organization.name,
          projectName,
          inviteToken,
          recipientName: input.name,
          role: 'Client',
        }, context.token!, organizationId);
      } catch (emailError) {
        console.error('Failed to send client invitation email:', emailError);
        if (emailError instanceof ServiceError) {
          console.error(
            `  notification: HTTP ${emailError.statusCode} (${emailError.service} ${emailError.operation}) ${emailError.message}`,
          );
        }
      }

      return client;
    },

    createProjectClient: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'clients', 'update');
      const row = await clientMgmtClient.post('/project-clients', input);
      const projectId = typeof input?.projectId === 'string' ? input.projectId : '';
      const clientId = typeof input?.clientId === 'string' ? input.clientId : '';
      if (projectId && clientId) {
        try {
          const project = await projectClient.getById('/projects', projectId);
          const orgId = project?.organizationId as string | undefined;
          if (orgId) {
            await provisionClientOrganizerWorkspaceHub({
              organizationId: orgId,
              projectId,
              projectName: project?.name,
              clientId,
              creatorUserId: user.id,
            });
          }
        } catch (hubErr) {
          console.error('[createProjectClient] client–organizer hub:', hubErr);
        }
      }
      return row;
    },
    updateProjectClient: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'update');
      return clientMgmtClient.put('/project-clients', id, input);
    },
    deleteProjectClient: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'delete');
      return clientMgmtClient.delete('/project-clients', id);
    },
    createClientFeedback: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'update');
      return clientMgmtClient.post('/client-feedback', input);
    },
    updateClientFeedback: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'update');
      return clientMgmtClient.put('/client-feedback', id, input);
    },
    deleteClientFeedback: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'delete');
      return clientMgmtClient.delete('/client-feedback', id);
    },
    createProposal: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'create');
      return clientMgmtClient.post('/proposals', input);
    },
    updateProposal: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'update');
      return clientMgmtClient.put('/proposals', id, input);
    },
    deleteProposal: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'clients', 'delete');
      return clientMgmtClient.delete('/proposals', id);
    },

    // Documentation (Knowledge Hub Service)
    createWiki: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'create');
      const oid = typeof input?.organizationId === 'string' ? input.organizationId.trim() : '';
      if (!oid) {
        throw new GraphQLError('organizationId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await requireOrganization(context, oid);
      return knowledgeClient.post('/wikis', input);
    },
    updateWiki: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      await assertWikiAccess(user, id);
      return knowledgeClient.put('/wikis', id, input);
    },
    deleteWiki: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'delete');
      await assertWikiAccess(user, id);
      return knowledgeClient.delete('/wikis', id);
    },
    createWikiProjectLink: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      if (typeof input?.wikiId === 'string' && input.wikiId) {
        await assertWikiAccess(user, input.wikiId);
      }
      return knowledgeClient.post('/wiki-project-links', input);
    },
    deleteWikiProjectLink: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
      return knowledgeClient.delete('/wiki-project-links', id);
    },
    createWikiMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      if (typeof input?.wikiId !== 'string' || !input.wikiId) {
        throw new GraphQLError('wikiId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await assertWikiAccess(user, input.wikiId);
      return knowledgeClient.post('/wiki-members', input);
    },
    deleteWikiMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      const member = await knowledgeClient.getById('/wiki-members', id).catch(() => null);
      if (member && typeof member.wikiId === 'string') {
        await assertWikiAccess(user, member.wikiId);
      }
      return knowledgeClient.delete('/wiki-members', id);
    },
    createWikiPage: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'create');
      if (typeof input?.wikiId !== 'string' || !input.wikiId.trim()) {
        throw new GraphQLError('wikiId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await assertWikiAccess(user, input.wikiId.trim());
      return knowledgeClient.post('/wiki-pages', input);
    },
    updateWikiPage: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      const page = await knowledgeClient.getById('/wiki-pages', id);
      if (page && typeof page.wikiId === 'string') {
        await assertWikiAccess(user, page.wikiId);
      }
      return knowledgeClient.put('/wiki-pages', id, input);
    },
    deleteWikiPage: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'delete');
      const page = await knowledgeClient.getById('/wiki-pages', id);
      if (page && typeof page.wikiId === 'string') {
        await assertWikiAccess(user, page.wikiId);
      }
      return knowledgeClient.delete('/wiki-pages', id);
    },
    createWikiPageVersion: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      const wikiPageId = typeof input?.wikiPageId === 'string' ? input.wikiPageId : '';
      if (!wikiPageId) {
        throw new GraphQLError('wikiPageId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      const page = await knowledgeClient.getById('/wiki-pages', wikiPageId);
      if (page && typeof page.wikiId === 'string') {
        await assertWikiAccess(user, page.wikiId);
      }
      return knowledgeClient.post('/wiki-page-versions', input);
    },
    createDocumentFolder: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'create');
      if (typeof input?.wikiId !== 'string' || !input.wikiId.trim()) {
        throw new GraphQLError('wikiId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await assertWikiAccess(user, input.wikiId.trim());
      return knowledgeClient.post('/document-folders', input);
    },
    updateDocumentFolder: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      const folder = await knowledgeClient.getById('/document-folders', id);
      if (folder && typeof folder.wikiId === 'string') {
        await assertWikiAccess(user, folder.wikiId);
      }
      return knowledgeClient.put('/document-folders', id, input);
    },
    deleteDocumentFolder: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'delete');
      const folder = await knowledgeClient.getById('/document-folders', id);
      if (folder && typeof folder.wikiId === 'string') {
        await assertWikiAccess(user, folder.wikiId);
      }
      return knowledgeClient.delete('/document-folders', id);
    },
    createDocument: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'read');
      if (typeof input?.wikiId !== 'string' || !input.wikiId) {
        throw new GraphQLError('wikiId is required to create a document', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await assertWikiAccess(user, input.wikiId);
      return knowledgeClient.post('/documents', input);
    },
    updateDocument: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'update');
      const doc = await knowledgeClient.getById('/documents', id);
      if (doc && typeof doc.wikiId === 'string') {
        await assertWikiAccess(user, doc.wikiId);
      }
      return knowledgeClient.put('/documents', id, input);
    },
    deleteDocument: async (_: unknown, { id }: { id: string }, context: Context) => {
      const user = await requirePermission(context, 'wiki', 'delete');
      const doc = await knowledgeClient.getById('/documents', id);
      if (doc && typeof doc.wikiId === 'string') {
        await assertWikiAccess(user, doc.wikiId);
      }
      return knowledgeClient.delete('/documents', id);
    },
    createDocumentPermission: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.post('/document-permissions', input);
    },
    updateDocumentPermission: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.put('/document-permissions', id, input);
    },
    deleteDocumentPermission: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
      return knowledgeClient.delete('/document-permissions', id);
    },

    // Communication (Communication Service)
    createChatChannel: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      let user;
      if (input.type === 'dm') {
        // Any authenticated user can create a DM conversation
        user = await requireAuth(context);
      } else {
        // Group/project channels require channels:create permission
        user = await requirePermission(context, 'channels', 'create');
      }
      const resolvedMemberIds = await resolveChatChannelMemberIds(input, user.id);
      // Enrich the input with the authenticated user's organizationId and id
      const enrichedInput = {
        ...input,
        organizationId: input.organizationId || getOrgId(user),
        createdBy: input.createdBy || user.id,
        memberIds: resolvedMemberIds,
      };
      return communicationClient.post('/chat-channels', enrichedInput);
    },
    updateChatChannel: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'channels', 'update');
      return communicationClient.put('/chat-channels', id, input);
    },
    deleteChatChannel: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'channels', 'delete');
      return communicationClient.delete('/chat-channels', id);
    },
    createChannelMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'channels', 'update');
      return communicationClient.post('/channel-members', input);
    },
    deleteChannelMember: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'channels', 'delete');
      return communicationClient.delete('/channel-members', id);
    },

    // AI & Automation (Monitoring Service)
    createAiConversation: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.post('/ai-conversations', input);
    },
    updateAiConversation: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.put('/ai-conversations', id, input);
    },
    deleteAiConversation: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.delete('/ai-conversations', id);
    },
    createAutomationRule: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'settings', 'update');
      return monitoringClient.post('/automation-rules', input);
    },
    updateAutomationRule: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'settings', 'update');
      return monitoringClient.put('/automation-rules', id, input);
    },
    deleteAutomationRule: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'settings', 'update');
      return monitoringClient.delete('/automation-rules', id);
    },
    createAutomationLog: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.post('/automation-logs', input);
    },

    // Monitoring (Monitoring Service)
    createKpiDefinition: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'create');
      return monitoringClient.post('/kpi-definitions', input);
    },
    updateKpiDefinition: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'update');
      return monitoringClient.put('/kpi-definitions', id, input);
    },
    deleteKpiDefinition: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'delete');
      return monitoringClient.delete('/kpi-definitions', id);
    },
    createKpiMeasurement: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'create');
      return monitoringClient.post('/kpi-measurements', input);
    },
    createReportTemplate: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'create');
      return monitoringClient.post('/report-templates', input);
    },
    updateReportTemplate: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'update');
      return monitoringClient.put('/report-templates', id, input);
    },
    deleteReportTemplate: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'delete');
      return monitoringClient.delete('/report-templates', id);
    },
    createGeneratedReport: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'create');
      return monitoringClient.post('/generated-reports', input);
    },
    createMemberPerformance: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'create');
      return monitoringClient.post('/member-performance', input);
    },
    createDashboard: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.post('/dashboards', input);
    },
    updateDashboard: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.put('/dashboards', id, input);
    },
    deleteDashboard: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.delete('/dashboards', id);
    },
    createDashboardWidget: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.post('/dashboard-widgets', input);
    },
    updateDashboardWidget: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.put('/dashboard-widgets', id, input);
    },
    deleteDashboardWidget: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return monitoringClient.delete('/dashboard-widgets', id);
    },

    // Report Schedules (Monitoring Service)
    createReportSchedule: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'create');
      return monitoringClient.post('/report-schedules', input);
    },
    updateReportSchedule: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'reports', 'update');
      return monitoringClient.put('/report-schedules', id, input);
    },
    deleteReportSchedule: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'reports', 'delete');
      return monitoringClient.delete('/report-schedules', id);
    },

    // Notifications (Notification Service)
    createNotificationTemplate: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'notifications', 'create');
      return notificationClient.post('/notification-templates', input);
    },
    updateNotificationTemplate: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'notifications', 'update');
      return notificationClient.put('/notification-templates', id, input);
    },
    deleteNotificationTemplate: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'notifications', 'delete');
      return notificationClient.delete('/notification-templates', id);
    },
    createNotificationPreference: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'notifications', 'update');
      return notificationClient.post('/notification-preferences', input);
    },
    updateNotificationPreference: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'notifications', 'update');
      return notificationClient.put('/notification-preferences', id, input);
    },
    deleteNotificationPreference: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'notifications', 'delete');
      return notificationClient.delete('/notification-preferences', id);
    },
    createNotification: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'notifications', 'create');
      return notificationClient.post('/notifications', input);
    },
    updateNotification: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'notifications', 'update');
      return notificationClient.put('/notifications', id, input);
    },
    deleteNotification: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'notifications', 'delete');
      return notificationClient.delete('/notifications', id);
    },
    markNotificationAsRead: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return notificationClient.put('/notifications', id, { isRead: true });
    },
    markAllNotificationsAsRead: async (_: unknown, __: unknown, context: Context) => {
      const user = await requireAuth(context);
      const userId = user.id;
      try {
        const notifications = await notificationClient.get(`/notifications?userId=${userId}`);
        if (!Array.isArray(notifications)) {
          return { count: 0, success: true };
        }
        let count = 0;
        for (const notification of notifications) {
          if (!notification.isRead) {
            await notificationClient.put('/notifications', notification.id, { isRead: true });
            count++;
          }
        }
        return { count, success: true };
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { count: 0, success: false };
      }
    },

    broadcastOrganizationAnnouncement: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const organizer = await requireOrganizer(context);
      const orgId = getOrgId(organizer);
      const raw = input && typeof input === 'object' ? input : {};
      const message = typeof raw.message === 'string' ? raw.message.trim() : '';
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      const channelId = typeof raw.channelId === 'string' ? raw.channelId.trim() : '';
      const postToChannel = raw.postToChannel !== false;

      if (!message) {
        throw new GraphQLError('message is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      if (message.length > 8000) {
        throw new GraphQLError('message must be 8000 characters or less', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      const members = await authClient.get(`/organization-members?organizationId=${orgId}`);
      if (!Array.isArray(members) || members.length === 0) {
        throw new GraphQLError('No organization members found', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }

      const userIds = [
        ...new Set(
          members
            .map((m: ServiceRecord) => m.userId)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
        ),
      ];

      const orgName = organizer.organization?.name?.trim() || 'Your organization';
      const senderLabel = `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() || organizer.email;
      const headerLine = title ? `📢 ${title}` : `📢 Announcement from ${orgName}`;
      const notificationBody = `${headerLine}\n\n${message}\n\n— ${senderLabel}`;

      const results = await Promise.allSettled(
        userIds.map((userId) =>
          notificationClient.post('/notifications', {
            userId,
            content: notificationBody,
            type: 'org_announcement',
            isRead: false,
          }),
        ),
      );
      const notificationCount = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - notificationCount;

      let postedToChannel = false;
      if (postToChannel && channelId) {
        try {
          const channel = await communicationClient.getById('/chat-channels', channelId);
          if (channel?.organizationId !== orgId) {
            throw new Error('Channel does not belong to this organization');
          }
          const channelMembers = await communicationClient.get(`/channel-members?channelId=${channelId}`);
          const memberIds = new Set(
            Array.isArray(channelMembers)
              ? channelMembers.map((cm: ServiceRecord) => cm.userId).filter(Boolean)
              : [],
          );
          if (!memberIds.has(organizer.id)) {
            throw new Error('You must be a member of this channel to post an announcement here');
          }
          const chatLine = title
            ? `📢 **Organization announcement:** ${title}\n\n${message}`
            : `📢 **Organization announcement**\n\n${message}`;
          await communicationClient.post('/messages', {
            channelId,
            senderId: organizer.id,
            content: `${chatLine}\n\n_Sent to all members as a notification._`,
            type: 'system',
          });
          postedToChannel = true;
        } catch (e) {
          console.error('[broadcastOrganizationAnnouncement] Channel post failed:', e);
          if (notificationCount === 0) {
            throw new GraphQLError(
              e instanceof Error ? e.message : 'Failed to post to channel and no notifications were created',
              { extensions: { code: 'BAD_REQUEST', statusCode: 400 } },
            );
          }
        }
      }

      const success = notificationCount > 0;
      const messageOut = success
        ? failed > 0
          ? `Sent ${notificationCount} of ${userIds.length} notifications.${postedToChannel ? ' Posted to channel.' : ''} ${failed} failed.`
          : `Sent ${notificationCount} notifications.${postedToChannel ? ' Posted to channel.' : ''}`
        : 'No notifications were delivered.';

      return {
        success,
        recipientCount: userIds.length,
        notificationCount,
        postedToChannel,
        message: messageOut,
      };
    },

    processDeadlineDelayNotifications: async (_: unknown, __: unknown, context: Context) => {
      const user = await requireOrganizer(context);
      const orgId = getOrgId(user);
      return processDeadlineDelayNotificationsForOrganization(orgId);
    },

    // AI Engine — forward organizationId so ai-engine auth/me + outbound tools match the user's workspace
    aiChat: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await validateAiRequest(context, input.organizationId, input.userId);
      const body = {
        query: input.query,
        sessionId: input.sessionId,
        confirmAction: input.confirmAction,
      };
      const result = await aiEngineClient.postWithAuth(
        '/api/chat',
        body,
        context.token || '',
        input.organizationId as string
      );
      return { success: true, data: result };
    },
    runClientWorkspaceAutoAgent: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const orgId = typeof input?.organizationId === 'string' ? input.organizationId : '';
      if (!orgId) {
        throw new GraphQLError('organizationId is required', {
          extensions: { code: 'BAD_USER_INPUT', statusCode: 400 },
        });
      }
      await validateAiRequest(context, orgId, undefined);
      await requireOrganizer(context);
      return aiEngineClient.postWithAuth(
        '/api/auto-agent/client-workspace',
        {
          projectId: input.projectId,
          channelId: input.channelId,
          organizationId: orgId,
          forceExecute: !!input.forceExecute,
          triggerSource: 'manual',
        },
        context.token || '',
        orgId
      );
    },
    aiClearHistory: async (_: unknown, { sessionId }: { sessionId: string }, context: Context) => {
      const user = await requireAuth(context);
      const orgId = getOrgId(user);
      await aiEngineClient.deleteWithAuth('/api/chat/history', sessionId, context.token || '', orgId);
      return { message: 'Conversation history cleared' };
    },
    aiSyncAll: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.postWithAuth('/api/sync/all', { organizationId }, context.token || '', organizationId);
    },
    aiSyncType: async (_: unknown, { organizationId, type }: { organizationId: string; type: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.postWithAuth(`/api/sync/${type}`, { organizationId }, context.token || '', organizationId);
    },
    aiIndexDocument: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireOrganization(context, input.organizationId);
      return aiEngineClient.postWithAuth('/api/sync/document', input, context.token || '', input.organizationId as string);
    },
    aiRemoveDocument: async (_: unknown, { sourceSchema, sourceTable, sourceId }: { sourceSchema: string; sourceTable: string; sourceId: string }, context: Context) => {
      const user = await requireAuth(context);
      const orgId = getOrgId(user);
      return aiEngineClient.postWithAuth(
        '/api/sync/document/remove',
        { sourceSchema, sourceTable, sourceId },
        context.token || '',
        orgId
      );
    },
  },
};

