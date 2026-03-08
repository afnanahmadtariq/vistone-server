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
import { requireAuth, requireOrganizer, requireOrganization, requirePermission, hasMetaPermission, isOrganizer, getOrgId, AuthContext } from '../lib/auth';
import { verifyTurnstileToken } from '../lib/turnstile';

interface Context extends AuthContext {
  headers: Record<string, string | string[] | undefined>;
  token?: string;
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

// Helper function to enrich user with workforce data
async function enrichUserWithWorkforceData(user: ServiceRecord | null): Promise<ServiceRecord | null> {
  if (!user) return null;

  try {
    // Get team membership for this user
    const teamMembers = await workforceClient.get(`/team-members?userId=${user.id}`);
    const teamMember = Array.isArray(teamMembers) ? teamMembers[0] : null;

    // Get skills for this user
    const userSkills = await workforceClient.get(`/user-skills?userId=${user.id}`);
    const skills = Array.isArray(userSkills) ? userSkills.map((s: ServiceRecord) => s.skillName) : [];

    return {
      ...user,
      teamId: teamMember?.teamId || null,
      joinedAt: teamMember?.createdAt || user.createdAt,
      skills,
      avatar: null,
      status: 'active',
    };
  } catch {
    // If workforce service is unavailable, return user with default enriched fields
    return {
      ...user,
      teamId: null,
      joinedAt: user.createdAt,
      skills: [],
      avatar: null,
      status: 'active',
    };
  }
}

// Cache for enriched users to avoid repeated calls during a single request
const userCache = new Map<string, ServiceRecord | null>();

// Helper to get enriched user by ID (with caching)
async function getEnrichedUser(userId: string): Promise<ServiceRecord | null> {
  if (userCache.has(userId)) {
    return userCache.get(userId) ?? null;
  }

  try {
    const user = await authClient.getById('/users', userId);
    const enrichedUser = await enrichUserWithWorkforceData(user);
    userCache.set(userId, enrichedUser);
    return enrichedUser;
  } catch {
    return null;
  }
}

// Clear cache periodically (simple approach)
setInterval(() => userCache.clear(), 60000); // Clear every minute

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
      return authClient.postWithAuth('/auth/me', {}, context.token);
    },
    getInviteDetails: async (_: unknown, { token }: { token: string }) => {
      return authClient.get(`/auth/invite-details/${token}`);
    },

    // Users & Organizations (Auth Service) — org-scoped
    users: async (_: unknown, { organizationId }: { organizationId?: string }, context: Context) => {
      const user = await requireAuth(context);
      const orgId = organizationId || getOrgId(user);
      // Filter users by organization membership
      const members = await authClient.get(`/organization-members?organizationId=${orgId}`);
      const memberUserIds = new Set(members.map((m: ServiceRecord) => m.userId));
      const users = await authClient.get('/users');
      const filteredUsers = users.filter((u: ServiceRecord) => memberUserIds.has(u.id));
      return Promise.all(filteredUsers.map(enrichUserWithWorkforceData));
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
    activityLogs: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return authClient.get('/activity-logs');
    },
    activityLog: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'settings', 'read');
      return authClient.getById('/activity-logs', id);
    },

    // Teams (Workforce Service) â€” org-scoped
    teams: async (_: unknown, { organizationId }: { organizationId?: string }, context: Context) => {
      const user = await requirePermission(context, 'teams', 'read');
      const orgId = organizationId || getOrgId(user);
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

    // Projects (Project Service) â€” org-scoped
    projects: async (_: unknown, { status, search, organizationId }: { status?: string; search?: string; organizationId?: string }, context: Context) => {
      const user = await requirePermission(context, 'projects', 'read');
      const orgId = organizationId || getOrgId(user);
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
    taskDependencies: async (_: unknown, _args: unknown, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.get('/task-dependencies');
    },
    taskDependency: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'tasks', 'read');
      return projectClient.getById('/task-dependencies', id);
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
      const orgId = organizationId || getOrgId(user);
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
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.get(`/wikis?organizationId=${organizationId}`);
    },
    wiki: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.getById('/wikis', id);
    },
    wikiProjectLinks: async (_: unknown, { projectId, wikiId }: { projectId?: string; wikiId?: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (wikiId) params.append('wikiId', wikiId);
      return knowledgeClient.get(`/wiki-project-links?${params.toString()}`);
    },
    wikiPages: async (_: unknown, { wikiId }: { wikiId: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.get(`/wiki-pages?wikiId=${wikiId}`);
    },
    wikiPage: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.getById('/wiki-pages', id);
    },
    wikiPageVersions: async (_: unknown, { wikiPageId }: { wikiPageId: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.get(`/wiki-page-versions?wikiPageId=${wikiPageId}`);
    },
    documentFolders: async (_: unknown, { wikiId }: { wikiId: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.get(`/document-folders?wikiId=${wikiId}`);
    },
    documentFolder: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.getById('/document-folders', id);
    },
    documents: async (_: unknown, { wikiId, folderId }: { wikiId: string; folderId?: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      const params = new URLSearchParams({ wikiId });
      if (folderId) params.append('folderId', folderId);
      return knowledgeClient.get(`/documents?${params.toString()}`);
    },
    document: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.getById('/documents', id);
    },
    documentPermissions: async (_: unknown, { documentId }: { documentId: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'read');
      return knowledgeClient.get(`/document-permissions?documentId=${documentId}`);
    },

    // Communication (Communication Service) â€" require channels:read
    chatChannels: async (_: unknown, { organizationId, userId, type, projectId }: { organizationId: string; userId?: string; type?: string; projectId?: string }, context: Context) => {
      await requirePermission(context, 'channels', 'read');
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

    // AI & Automation (Monitoring Service) â€” require reports:read
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
      const orgId = organizationId || getOrgId(user);
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
      return aiEngineClient.getWithAuth(`/api/sync/stats/${organizationId}`, context.token || '');
    },

    // Analytics & Dashboard
    myProjects: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      const projectIds = new Set<string>();

      try {
        // 1. As Member/Manager
        const projectMembers = await projectClient.get(`/project-members?userId=${user.id}`);
        if (Array.isArray(projectMembers)) {
          projectMembers.forEach((pm: ServiceRecord) => projectIds.add(pm.projectId));
        }

        const managedProjects = await projectClient.get(`/projects?managerId=${user.id}`);
        if (Array.isArray(managedProjects)) {
          managedProjects.forEach((p: ServiceRecord) => projectIds.add(p.id));
        }

        // 2. As Client contact person
        const clients = await clientMgmtClient.get(`/clients?contactPersonId=${user.id}`);
        if (Array.isArray(clients)) {
          for (const client of clients) {
            const pcs = await clientMgmtClient.get(`/project-clients?clientId=${client.id}`);
            if (Array.isArray(pcs)) {
              pcs.forEach((pc: ServiceRecord) => projectIds.add(pc.projectId));
            }
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

        // Get all tasks for these projects
        const allTasks: ServiceRecord[] = [];
        for (const project of projectArray) {
          try {
            const tasks = await projectClient.get(`/tasks?projectId=${project.id}`);
            if (Array.isArray(tasks)) allTasks.push(...tasks);
          } catch { /* ignore */ }
        }

        // Get all milestones
        const allMilestones: ServiceRecord[] = [];
        for (const project of projectArray) {
          try {
            const milestones = await projectClient.get(`/milestones?projectId=${project.id}`);
            if (Array.isArray(milestones)) allMilestones.push(...milestones);
          } catch { /* ignore */ }
        }

        // Get risk registers
        const allRisks: ServiceRecord[] = [];
        for (const project of projectArray) {
          try {
            const risks = await projectClient.get(`/risk-register?projectId=${project.id}`);
            if (Array.isArray(risks)) allRisks.push(...risks);
          } catch { /* ignore */ }
        }

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

      try {
        // Get all projects for the organization
        const projects = await projectClient.get(`/projects?organizationId=${organizationId}`);
        const projectArray = Array.isArray(projects) ? projects : [];

        const totalProjects = projectArray.length;
        const activeProjects = projectArray.filter((p: ServiceRecord) => p.status === 'Active' || p.status === 'In Progress').length;

        // Get all tasks
        let totalTasks = 0;
        let completedTasks = 0;
        const allMilestones: ServiceRecord[] = [];

        for (const project of projectArray) {
          try {
            const tasks = await projectClient.get(`/tasks?projectId=${project.id}`);
            if (Array.isArray(tasks)) {
              totalTasks += tasks.length;
              completedTasks += tasks.filter((t: ServiceRecord) => t.status === 'Completed' || t.status === 'Done').length;
            }
            const milestones = await projectClient.get(`/milestones?projectId=${project.id}`);
            if (Array.isArray(milestones)) {
              allMilestones.push(...milestones.map((m: ServiceRecord) => ({
                ...m,
                projectId: project.id,
                projectName: project.name,
              })));
            }
          } catch { /* ignore */ }
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

        // Get recent activity logs
        let recentActivities: ServiceRecord[] = [];
        try {
          const activityLogs = await authClient.get('/activity-logs');
          if (Array.isArray(activityLogs)) {
            recentActivities = activityLogs
              .slice(0, 10)
              .map((log: ServiceRecord) => ({
                id: log.id,
                type: log.action,
                description: `${log.action} on ${log.entityType}`,
                timestamp: log.createdAt,
                user: null,
                project: null,
              }));
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
        
        // Find Client entities where this user is the contact person
        const clients = await clientMgmtClient.get(`/clients?contactPersonId=${user.id}`);
        if (Array.isArray(clients)) {
          for (const client of clients) {
            const pcs = await clientMgmtClient.get(`/project-clients?clientId=${client.id}`);
            if (Array.isArray(pcs)) {
              pcs.forEach((pc: ServiceRecord) => projectIds.add(pc.projectId));
            }
          }
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
        
        // Fetch Activities for these projects
        const activities: ServiceRecord[] = [];
        for (const project of projects) {
          try {
            const logs = await authClient.get(`/activity-logs?entityType=project&entityId=${project.id}`);
            if (Array.isArray(logs)) {
              logs.forEach(log => {
                activities.push({
                  id: log.id,
                  type: log.action || 'update',
                  description: log.description || `${log.action} on project ${project.name}`,
                  timestamp: log.createdAt,
                  userId: log.userId,
                  projectId: project.id,
                  // We'll return the project object directly to help the resolver if we add one
                  project: project
                });
              });
            }
          } catch { /* ignore */ }
        }
        
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

  Project: {
    tasks: async (parent: ServiceRecord) => {
      try {
        return await projectClient.get(`/tasks?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    milestones: async (parent: ServiceRecord) => {
      try {
        return await projectClient.get(`/milestones?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    client: async (parent: ServiceRecord) => {
      if (!parent.clientId) return null;
      try {
        return await clientMgmtClient.getById('/clients', parent.clientId);
      } catch {
        return null;
      }
    },
    manager: async (parent: ServiceRecord) => {
      if (!parent.managerId) return null;
      return getEnrichedUser(parent.managerId);
    },
    members: async (parent: ServiceRecord) => {
      try {
        // Get project members
        const projectMembers = await projectClient.get(`/project-members?projectId=${parent.id}`);
        if (!Array.isArray(projectMembers) || projectMembers.length === 0) return [];

        // Get user details for each member
        const members = await Promise.all(
          projectMembers.map((pm: ServiceRecord) => getEnrichedUser(pm.userId))
        );
        return members.filter(Boolean);
      } catch {
        return [];
      }
    },
    memberIds: async (parent: ServiceRecord) => {
      try {
        const projectMembers = await projectClient.get(`/project-members?projectId=${parent.id}`);
        return Array.isArray(projectMembers) ? projectMembers.map((pm: ServiceRecord) => pm.userId) : [];
      } catch {
        return [];
      }
    },
    teams: async (parent: ServiceRecord) => {
      if (!parent.teamIds || parent.teamIds.length === 0) return [];
      try {
        const teams = await Promise.all(
          parent.teamIds.map((teamId: string) => workforceClient.getById('/teams', teamId))
        );
        return teams.filter(Boolean);
      } catch {
        return [];
      }
    },
    activities: async (parent: ServiceRecord) => {
      try {
        // Get activity logs related to this project
        const activityLogs = await authClient.get(`/activity-logs?entityType=project&entityId=${parent.id}`);
        if (!Array.isArray(activityLogs)) return [];

        // Transform activity logs to ProjectActivity format
        const activities = await Promise.all(
          activityLogs.slice(0, 20).map(async (log: ServiceRecord) => {
            let user = null;
            if (log.userId) {
              try {
                user = await getEnrichedUser(log.userId);
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
    documents: async (parent: ServiceRecord) => {
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
                uploadedBy = await getEnrichedUser(doc.createdById || doc.uploadedById);
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
        return await projectClient.get(`/risk-registers?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
  },

  Task: {
    priority: (parent: ServiceRecord) => parent.priority ?? 'medium',
    assignees: async (parent: ServiceRecord) => {
      // If there's an assigneeId, return that user as a single-element array
      if (parent.assigneeId) {
        const user = await getEnrichedUser(parent.assigneeId);
        return user ? [user] : [];
      }
      return [];
    },
    creator: async (parent: ServiceRecord) => {
      if (!parent.creatorId) return null;
      return getEnrichedUser(parent.creatorId);
    },
  },

  Milestone: {
    name: (parent: ServiceRecord) => parent.name ?? parent.title,
    completed: (parent: ServiceRecord) => parent.completed ?? (parent.status === 'completed'),
    completedAt: (parent: ServiceRecord) => parent.completedAt ?? null,
    dueDate: (parent: ServiceRecord) => parent.dueDate ?? new Date(),
  },

  Client: {
    email: (parent: ServiceRecord) => parent.email ?? parent.contactInfo?.email ?? null,
    company: (parent: ServiceRecord) => parent.company ?? parent.contactInfo?.company ?? null,
    phone: (parent: ServiceRecord) => parent.phone ?? parent.contactInfo?.phone ?? null,
    address: (parent: ServiceRecord) => parent.address ?? parent.contactInfo?.address ?? null,
    industry: (parent: ServiceRecord) => parent.industry ?? null,
    status: (parent: ServiceRecord) => parent.status ?? 'active',
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
    projects: async (parent: ServiceRecord) => {
      try {
        const projectClients = await clientMgmtClient.get(`/project-clients?clientId=${parent.id}`);
        if (!Array.isArray(projectClients) || projectClients.length === 0) return [];
        const projects = await Promise.all(
          projectClients.map((pc: ServiceRecord) => projectClient.getById('/projects', pc.projectId).catch(() => null))
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
    contactPerson: async (parent: ServiceRecord) => {
      if (!parent.contactPersonId) return null;
      return getEnrichedUser(parent.contactPersonId);
    },
  },

  // User resolver to handle enrichment for any User type returned
  User: {
    role: async (parent: ServiceRecord) => {
      // If role is explicitly provided and is not 'member' (team fallback), use it
      if (parent.role && parent.role !== 'member') return parent.role;
      // Look up role from organization membership
      try {
        const memberships = await authClient.get(`/organization-members?userId=${parent.id}`);
        if (Array.isArray(memberships) && memberships.length > 0 && memberships[0].roleId) {
          const role = await authClient.getById('/roles', memberships[0].roleId);
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
    permissions: async (parent: ServiceRecord) => {
      // If permissions already present on the parent (e.g. from enrichment), return them
      if (parent.permissions) return parent.permissions;

      // Otherwise, look up from org membership -> role
      try {
        const memberships = await authClient.get(`/organization-members?userId=${parent.id}`);
        if (Array.isArray(memberships) && memberships.length > 0 && memberships[0].roleId) {
          const role = await authClient.getById('/roles', memberships[0].roleId);
          return role?.permissions ?? null;
        }
      } catch {
        // ignore
      }
      return null;
    },
    team: async (parent: ServiceRecord) => {
      const teamId = parent.teamId;
      if (!teamId) {
        // Try to find team from team members
        try {
          const teamMembers = await workforceClient.get(`/team-members?userId=${parent.id}`);
          if (Array.isArray(teamMembers) && teamMembers.length > 0) {
            return workforceClient.getById('/teams', teamMembers[0].teamId);
          }
        } catch {
          return null;
        }
        return null;
      }
      try {
        return await workforceClient.getById('/teams', teamId);
      } catch {
        return null;
      }
    },
  },

  ActivityItem: {
    user: async (parent: ServiceRecord) => {
      if (!parent.userId) return null;
      try {
        return await getEnrichedUser(parent.userId);
      } catch {
        return null;
      }
    },
    project: async (parent: ServiceRecord) => {
      if (parent.project) return parent.project;
      if (!parent.projectId) return null;
      try {
        return await projectClient.getById('/projects', parent.projectId);
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
      // Call auth service to accept the invitation
      return authClient.post('/auth/accept-invite', { token, password, name, role });
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
      return authClient.put('/users', id, input);
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
        // Try to find existing user by email
        const users = await authClient.get('/users');
        user = users.find((u: ServiceRecord) => u.email === input.email);

        if (!user) {
          // Create new user
          user = await authClient.post('/users', {
            email: input.email,
            firstName: input.firstName || '',
            lastName: input.lastName || '',
            jobTitle: input.jobTitle || '',
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
                wiki: [],
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

      // Add user to organization as a member with the resolved roleId
      try {
        await authClient.post('/organization-members', {
          userId: user.id,
          organizationId,
          roleId, // Use the resolved roleId from input.role
        });
      } catch {
        // User might already be a member, continue
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

        // Generate invite token by calling the new auth service invitations endpoint
        let inviteToken = '';
        try {
          const invData = await authClient.post('/invitations', {
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
          console.error('Failed to create invitation record:', invErr);
          throw new GraphQLError('Failed to generate secure invitation token. Please try again.', {
            extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
          });
        }

        if (input.teamId && teamName) {
          // Send team invitation
          await notificationClient.post('/emails/invite/team', {
            email: input.email,
            inviterName,
            teamName,
            organizationName: organization.name,
            inviteToken,
            recipientName,
            role: input.jobTitle || input.role,
          });
        } else {
          // Send organization invitation
          await notificationClient.post('/emails/invite/organization', {
            email: input.email,
            inviterName,
            organizationName: organization.name,
            inviteToken,
            recipientName,
            role: input.jobTitle || input.role,
          });
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
      await requireAuth(context);
      return authClient.post('/activity-logs', input);
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
      await requireAuth(context);
      await workforceClient.post('/team-members', { teamId, userId, role: 'member' });
      return workforceClient.getById('/teams', teamId);
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
      await requireAuth(context);
      return workforceClient.post('/team-members', input);
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
        for (const userId of input.contributors) {
          try {
            await projectClient.post('/project-members', {
              projectId: project.id,
              userId,
              role: 'contributor',
            });
          } catch (error) {
            console.error(`Failed to add contributor ${userId}:`, error);
          }
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
      }

      return project;
    },
    updateProject: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
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
      if (input.type !== undefined || input.visibility !== undefined ||
        input.notifyTeam !== undefined || input.notifyClient !== undefined) {
        const existingProject = await projectClient.getById('/projects', id);
        const existingMetadata = existingProject?.metadata || {};
        projectData.metadata = {
          ...existingMetadata,
          ...(input.type !== undefined && { type: input.type }),
          ...(input.visibility !== undefined && { visibility: input.visibility }),
          ...(input.notifyTeam !== undefined && { notifyTeam: input.notifyTeam }),
          ...(input.notifyClient !== undefined && { notifyClient: input.notifyClient }),
        };
      }
      return projectClient.put('/projects', id, projectData);
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
      return projectClient.post('/tasks', input);
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
      await requirePermission(context, 'tasks', 'delete');
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
    createMilestone: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.post('/milestones', input);
    },
    updateMilestone: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'projects', 'update');
      return projectClient.put('/milestones', id, input);
    },
    deleteMilestone: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'projects', 'delete');
      return projectClient.delete('/milestones', id);
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
        const users = await authClient.get('/users');
        user = users.find((u: ServiceRecord) => u.email === input.email);
        
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
              wiki: [],
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

      try {
        await authClient.post('/organization-members', {
          userId: user.id,
          organizationId,
          roleId,
        });
      } catch {
        // May already exist
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
            status: 'active',
            contactPersonId: user.id,
          });
        } else {
          client = await clientMgmtClient.put('/clients', client.id, {
            portalAccess: true,
            contactPersonId: user.id,
            address: input.address,
            industry: input.industry,
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
        } catch {
          // Relationship might already exist
        }
      }

      try {
        const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        const inviteToken = user.id;
        await notificationClient.post('/emails/invite/client', {
          email: input.email,
          inviterName,
          organizationName: organization.name,
          projectName,
          inviteToken,
          recipientName: input.name,
          role: 'Client',
        });
      } catch (emailError) {
        console.error('Failed to send client invitation email:', emailError);
      }

      return client;
    },

    createProjectClient: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'clients', 'update');
      return clientMgmtClient.post('/project-clients', input);
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
      return knowledgeClient.post('/wikis', input);
    },
    updateWiki: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.put('/wikis', id, input);
    },
    deleteWiki: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
      return knowledgeClient.delete('/wikis', id);
    },
    createWikiProjectLink: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.post('/wiki-project-links', input);
    },
    deleteWikiProjectLink: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
      return knowledgeClient.delete('/wiki-project-links', id);
    },
    createWikiPage: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'create');
      return knowledgeClient.post('/wiki-pages', input);
    },
    updateWikiPage: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.put('/wiki-pages', id, input);
    },
    deleteWikiPage: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
      return knowledgeClient.delete('/wiki-pages', id);
    },
    createWikiPageVersion: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.post('/wiki-page-versions', input);
    },
    createDocumentFolder: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'create');
      return knowledgeClient.post('/document-folders', input);
    },
    updateDocumentFolder: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.put('/document-folders', id, input);
    },
    deleteDocumentFolder: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
      return knowledgeClient.delete('/document-folders', id);
    },
    createDocument: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'create');
      return knowledgeClient.post('/documents', input);
    },
    updateDocument: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }, context: Context) => {
      await requirePermission(context, 'wiki', 'update');
      return knowledgeClient.put('/documents', id, input);
    },
    deleteDocument: async (_: unknown, { id }: { id: string }, context: Context) => {
      await requirePermission(context, 'wiki', 'delete');
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
      await requirePermission(context, 'channels', 'create');
      return communicationClient.post('/chat-channels', input);
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

    // AI Engine
    aiChat: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await validateAiRequest(context, input.organizationId, input.userId);
      const result = await aiEngineClient.postWithAuth('/api/chat', input, context.token || '');
      return { success: true, data: result };
    },
    aiClearHistory: async (_: unknown, { sessionId }: { sessionId: string }, context: Context) => {
      await requireAuth(context);
      await aiEngineClient.deleteWithAuth('/api/chat/history', sessionId, context.token || '');
      return { message: 'Conversation history cleared' };
    },
    aiSyncAll: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.postWithAuth('/api/sync/all', { organizationId }, context.token || '');
    },
    aiSyncType: async (_: unknown, { organizationId, type }: { organizationId: string; type: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.postWithAuth(`/api/sync/${type}`, { organizationId }, context.token || '');
    },
    aiIndexDocument: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireOrganization(context, input.organizationId);
      return aiEngineClient.postWithAuth('/api/sync/document', input, context.token || '');
    },
    aiRemoveDocument: async (_: unknown, { sourceSchema, sourceTable, sourceId }: { sourceSchema: string; sourceTable: string; sourceId: string }, context: Context) => {
      await requireAuth(context);
      return aiEngineClient.postWithAuth('/api/sync/document/remove', { sourceSchema, sourceTable, sourceId }, context.token || '');
    },
  },
};

