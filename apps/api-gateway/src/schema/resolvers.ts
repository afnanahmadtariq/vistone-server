import { GraphQLScalarType, Kind } from 'graphql';
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
import { requireAuth, requireAdmin, requireOrganization, AuthContext } from '../lib/auth';
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
    throw new Error('Forbidden: userId must match the authenticated user');
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
      role: teamMember?.role || null,
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
      role: null,
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
        throw new Error('Not authenticated');
      }
      return authClient.postWithAuth('/auth/me', {}, context.token);
    },

    // Users & Organizations (Auth Service)
    users: async (_: unknown, { organizationId }: { organizationId?: string }) => {
      const users = await authClient.get('/users');
      let filteredUsers = users;

      // If organizationId is provided, filter users by organization membership
      if (organizationId) {
        // Get organization members for this organization
        const members = await authClient.get(`/organization-members?organizationId=${organizationId}`);
        const memberUserIds = new Set(members.map((m: ServiceRecord) => m.userId));
        filteredUsers = users.filter((user: ServiceRecord) => memberUserIds.has(user.id));
      }

      return Promise.all(filteredUsers.map(enrichUserWithWorkforceData));
    },
    user: async (_: unknown, { id }: { id: string }) => {
      const user = await authClient.getById('/users', id);
      return enrichUserWithWorkforceData(user);
    },
    organizations: () => authClient.get('/organizations'),
    organization: (_: unknown, { id }: { id: string }) => authClient.getById('/organizations', id),
    organizationMembers: () => authClient.get('/organization-members'),
    organizationMember: (_: unknown, { id }: { id: string }) => authClient.getById('/organization-members', id),
    roles: () => authClient.get('/roles'),
    role: (_: unknown, { id }: { id: string }) => authClient.getById('/roles', id),
    kycData: () => authClient.get('/kyc-data'),
    kycDataById: (_: unknown, { id }: { id: string }) => authClient.getById('/kyc-data', id),
    mfaSettings: () => authClient.get('/mfa-settings'),
    mfaSetting: (_: unknown, { id }: { id: string }) => authClient.getById('/mfa-settings', id),
    activityLogs: () => authClient.get('/activity-logs'),
    activityLog: (_: unknown, { id }: { id: string }) => authClient.getById('/activity-logs', id),

    // Teams (Workforce Service)
    teams: (_: unknown, { organizationId }: { organizationId?: string }) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      return workforceClient.get(`/teams?${params.toString()}`);
    },
    team: (_: unknown, { id }: { id: string }) => workforceClient.getById('/teams', id),
    teamMembers: () => workforceClient.get('/team-members'),
    teamMember: (_: unknown, { id }: { id: string }) => workforceClient.getById('/team-members', id),
    userSkills: () => workforceClient.get('/user-skills'),
    userSkill: (_: unknown, { id }: { id: string }) => workforceClient.getById('/user-skills', id),
    userAvailability: () => workforceClient.get('/user-availability'),
    userAvailabilityById: (_: unknown, { id }: { id: string }) => workforceClient.getById('/user-availability', id),

    // Projects (Project Service)
    projects: (_: unknown, { status, search, organizationId }: { status?: string; search?: string; organizationId?: string }) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (organizationId) params.append('organizationId', organizationId);
      return projectClient.get(`/projects?${params.toString()}`);
    },
    project: (_: unknown, { id }: { id: string }) => projectClient.getById('/projects', id),
    projectMembers: () => projectClient.get('/project-members'),
    projectMember: (_: unknown, { id }: { id: string }) => projectClient.getById('/project-members', id),
    tasks: () => projectClient.get('/tasks'),
    task: (_: unknown, { id }: { id: string }) => projectClient.getById('/tasks', id),
    taskChecklists: () => projectClient.get('/task-checklists'),
    taskChecklist: (_: unknown, { id }: { id: string }) => projectClient.getById('/task-checklists', id),
    taskDependencies: () => projectClient.get('/task-dependencies'),
    taskDependency: (_: unknown, { id }: { id: string }) => projectClient.getById('/task-dependencies', id),
    milestones: () => projectClient.get('/milestones'),
    milestone: (_: unknown, { id }: { id: string }) => projectClient.getById('/milestones', id),
    riskRegisters: () => projectClient.get('/risk-register'),
    riskRegister: (_: unknown, { id }: { id: string }) => projectClient.getById('/risk-register', id),
    aiInsights: () => projectClient.get('/ai-insights'),
    aiInsight: (_: unknown, { id }: { id: string }) => projectClient.getById('/ai-insights', id),

    // Clients (Client Management Service)
    clients: (_: unknown, { search, status, industry, organizationId }: { search?: string; status?: string; industry?: string; organizationId?: string }) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (industry) params.append('industry', industry);
      if (organizationId) params.append('organizationId', organizationId);
      return clientMgmtClient.get(`/clients?${params.toString()}`);
    },
    client: (_: unknown, { id }: { id: string }) => clientMgmtClient.getById('/clients', id),
    projectClients: () => clientMgmtClient.get('/project-clients'),
    projectClient: (_: unknown, { id }: { id: string }) => clientMgmtClient.getById('/project-clients', id),
    clientFeedbacks: () => clientMgmtClient.get('/client-feedback'),
    clientFeedback: (_: unknown, { id }: { id: string }) => clientMgmtClient.getById('/client-feedback', id),
    proposals: () => clientMgmtClient.get('/proposals'),
    proposal: (_: unknown, { id }: { id: string }) => clientMgmtClient.getById('/proposals', id),

    // Documentation (Knowledge Hub Service)
    wikiPages: () => knowledgeClient.get('/wiki-pages'),
    wikiPage: (_: unknown, { id }: { id: string }) => knowledgeClient.getById('/wiki-pages', id),
    wikiPageVersions: () => knowledgeClient.get('/wiki-page-versions'),
    wikiPageVersion: (_: unknown, { id }: { id: string }) => knowledgeClient.getById('/wiki-page-versions', id),
    documentFolders: () => knowledgeClient.get('/document-folders'),
    documentFolder: (_: unknown, { id }: { id: string }) => knowledgeClient.getById('/document-folders', id),
    documents: () => knowledgeClient.get('/documents'),
    document: (_: unknown, { id }: { id: string }) => knowledgeClient.getById('/documents', id),
    documentPermissions: () => knowledgeClient.get('/document-permissions'),
    documentPermission: (_: unknown, { id }: { id: string }) => knowledgeClient.getById('/document-permissions', id),
    documentLinks: () => knowledgeClient.get('/document-links'),
    documentLink: (_: unknown, { id }: { id: string }) => knowledgeClient.getById('/document-links', id),

    // Communication (Communication Service)
    chatChannels: () => communicationClient.get('/chat-channels'),
    chatChannel: (_: unknown, { id }: { id: string }) => communicationClient.getById('/chat-channels', id),
    channelMembers: () => communicationClient.get('/channel-members'),
    channelMember: (_: unknown, { id }: { id: string }) => communicationClient.getById('/channel-members', id),
    chatMessages: () => communicationClient.get('/chat-messages'),
    chatMessage: (_: unknown, { id }: { id: string }) => communicationClient.getById('/chat-messages', id),
    messageMentions: () => communicationClient.get('/message-mentions'),
    messageMention: (_: unknown, { id }: { id: string }) => communicationClient.getById('/message-mentions', id),
    messageAttachments: () => communicationClient.get('/message-attachments'),
    messageAttachment: (_: unknown, { id }: { id: string }) => communicationClient.getById('/message-attachments', id),
    communicationLogs: () => communicationClient.get('/communication-logs'),
    communicationLog: (_: unknown, { id }: { id: string }) => communicationClient.getById('/communication-logs', id),

    // AI & Automation (Monitoring Service)
    aiConversations: () => monitoringClient.get('/ai-conversations'),
    aiConversation: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/ai-conversations', id),
    automationRules: () => monitoringClient.get('/automation-rules'),
    automationRule: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/automation-rules', id),
    automationLogs: () => monitoringClient.get('/automation-logs'),
    automationLog: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/automation-logs', id),

    // Monitoring (Monitoring Service)
    kpiDefinitions: () => monitoringClient.get('/kpi-definitions'),
    kpiDefinition: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/kpi-definitions', id),
    kpiMeasurements: () => monitoringClient.get('/kpi-measurements'),
    kpiMeasurement: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/kpi-measurements', id),
    reportTemplates: () => monitoringClient.get('/report-templates'),
    reportTemplate: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/report-templates', id),
    generatedReports: () => monitoringClient.get('/generated-reports'),
    generatedReport: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/generated-reports', id),
    memberPerformances: () => monitoringClient.get('/member-performance'),
    memberPerformance: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/member-performance', id),
    dashboards: () => monitoringClient.get('/dashboards'),
    dashboard: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/dashboards', id),
    dashboardWidgets: () => monitoringClient.get('/dashboard-widgets'),
    dashboardWidget: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/dashboard-widgets', id),

    // Report Schedules (Monitoring Service)
    reportSchedules: (_: unknown, { organizationId }: { organizationId?: string }) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      return monitoringClient.get(`/report-schedules?${params.toString()}`);
    },
    reportSchedule: (_: unknown, { id }: { id: string }) => monitoringClient.getById('/report-schedules', id),

    // Notifications (Notification Service)
    notificationTemplates: () => notificationClient.get('/notification-templates'),
    notificationTemplate: (_: unknown, { id }: { id: string }) => notificationClient.getById('/notification-templates', id),
    notificationPreferences: () => notificationClient.get('/notification-preferences'),
    notificationPreference: (_: unknown, { id }: { id: string }) => notificationClient.getById('/notification-preferences', id),
    notifications: () => notificationClient.get('/notifications'),
    notification: (_: unknown, { id }: { id: string }) => notificationClient.getById('/notifications', id),

    // AI Engine
    aiChatStats: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.get(`/api/chat/stats/${organizationId}`);
    },

    // Analytics & Dashboard
    myProjects: async (_: unknown, _args: unknown, context: Context) => {
      const user = await requireAuth(context);
      try {
        // Get projects where the user is either:
        // 1. A project member
        // 2. A manager
        // 3. Associated as client contact
        const projectMembers = await projectClient.get(`/project-members?userId=${user.id}`);
        const projectIds = new Set<string>();

        if (Array.isArray(projectMembers)) {
          projectMembers.forEach((pm: ServiceRecord) => projectIds.add(pm.projectId));
        }

        // Also get projects where user is manager
        const managedProjects = await projectClient.get(`/projects?managerId=${user.id}`);
        if (Array.isArray(managedProjects)) {
          managedProjects.forEach((p: ServiceRecord) => projectIds.add(p.id));
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
            const risks = await projectClient.get(`/risk-registers?projectId=${project.id}`);
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
    role: (parent: ServiceRecord) => parent.role ?? null,
    avatar: (parent: ServiceRecord) => parent.avatar ?? parent.avatarUrl ?? null,
    status: (parent: ServiceRecord) => parent.status ?? 'active',
    skills: (parent: ServiceRecord) => parent.skills ?? [],
    teamId: (parent: ServiceRecord) => parent.teamId ?? null,
    joinedAt: (parent: ServiceRecord) => parent.joinedAt ?? parent.createdAt,
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

  Mutation: {
    // Authentication
    login: async (_: unknown, { email, password, turnstileToken }: { email: string; password: string; turnstileToken: string }, context: Context) => {
      const ip = (Array.isArray(context.headers['x-forwarded-for'])
        ? context.headers['x-forwarded-for'][0]
        : context.headers['x-forwarded-for']) || '';

      const isValid = await verifyTurnstileToken(turnstileToken, ip);
      if (!isValid) {
        throw new Error('Invalid CAPTCHA');
      }

      return authClient.post('/auth/login', { email, password });
    },
    register: async (_: unknown, { name, email, password, organizationName, turnstileToken }: { name: string; email: string; password: string; organizationName?: string; turnstileToken: string }, context: Context) => {
      const ip = (Array.isArray(context.headers['x-forwarded-for'])
        ? context.headers['x-forwarded-for'][0]
        : context.headers['x-forwarded-for']) || '';

      const isValid = await verifyTurnstileToken(turnstileToken, ip);
      if (!isValid) {
        throw new Error('Invalid CAPTCHA');
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
                if (role && role.name === 'Admin' && role.isSystem === true) {
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

          // Delete organization roles
          try {
            const roles = await authClient.get(`/roles?organizationId=${orgId}`);
            if (Array.isArray(roles)) {
              for (const role of roles) {
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
        throw new Error('Failed to delete account. Please try again or contact support.');
      }
    },

    // Teams - Enhanced
    removeMember: async (_: unknown, { teamId, memberId }: { teamId: string; memberId: string }) => {
      return workforceClient.post('/teams/remove-member', { teamId, memberId });
    },

    // Users & Organizations (Auth Service)
    createUser: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      // Only Admins can create users
      const currentUser = await requireAdmin(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return authClient.post('/users', input);
    },
    updateUser: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => authClient.put('/users', id, input),
    updateUserRole: async (_: unknown, { userId, role }: { userId: string; role: string }, context: Context) => {
      const currentUser = await requireAdmin(context);
      const organizationId = currentUser.organizationId;

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Find the user's organization membership
      const memberships = await authClient.get(`/organization-members?userId=${userId}&organizationId=${organizationId}`);
      if (!Array.isArray(memberships) || memberships.length === 0) {
        throw new Error('User is not a member of this organization');
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
            users: ['create', 'read', 'update', 'delete', 'invite'],
            teams: ['create', 'read', 'update', 'delete'],
            projects: ['create', 'read', 'update', 'delete'],
            tasks: ['create', 'read', 'update', 'delete', 'assign'],
            clients: ['create', 'read', 'update', 'delete'],
            wiki: ['create', 'read', 'update', 'delete'],
            channels: ['create', 'read', 'update', 'delete'],
            settings: ['read', 'update'],
            reports: ['read', 'export'],
            notifications: ['read', 'update'],
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
          throw new Error(`Unknown role: ${role}`);
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
    deleteUser: (_: unknown, { id }: { id: string }) => authClient.delete('/users', id),
    inviteMember: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Use organizationId from input or current user
      const organizationId = input.organizationId || currentUser.organizationId;
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Get organization details for the email
      let organization;
      try {
        organization = await authClient.getById('/organizations', organizationId);
      } catch {
        throw new Error('Organization not found');
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
          });
        }
      } catch {
        throw new Error('Failed to create or find user');
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

        // Generate invite token (user ID can be used as token for simplicity)
        const inviteToken = user.id;

        if (input.teamId && teamName) {
          // Send team invitation
          await notificationClient.post('/emails/invite/team', {
            email: input.email,
            inviterName,
            teamName,
            organizationName: organization.name,
            inviteToken,
            recipientName,
          });
        } else {
          // Send organization invitation
          await notificationClient.post('/emails/invite/organization', {
            email: input.email,
            inviterName,
            organizationName: organization.name,
            inviteToken,
            recipientName,
          });
        }
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the entire operation if email fails
      }

      return enrichUserWithWorkforceData(user);
    },
    createOrganization: (_: unknown, { input }: { input: ServiceRecord }) => authClient.post('/organizations', input),
    updateOrganization: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => authClient.put('/organizations', id, input),
    deleteOrganization: (_: unknown, { id }: { id: string }) => authClient.delete('/organizations', id),
    createOrganizationMember: (_: unknown, { input }: { input: ServiceRecord }) => authClient.post('/organization-members', input),
    updateOrganizationMember: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => authClient.put('/organization-members', id, input),
    deleteOrganizationMember: (_: unknown, { id }: { id: string }) => authClient.delete('/organization-members', id),
    createRole: (_: unknown, { input }: { input: ServiceRecord }) => authClient.post('/roles', input),
    updateRole: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => authClient.put('/roles', id, input),
    deleteRole: (_: unknown, { id }: { id: string }) => authClient.delete('/roles', id),
    createKycData: (_: unknown, { input }: { input: ServiceRecord }) => authClient.post('/kyc-data', input),
    updateKycData: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => authClient.put('/kyc-data', id, input),
    deleteKycData: (_: unknown, { id }: { id: string }) => authClient.delete('/kyc-data', id),
    createMfaSetting: (_: unknown, { input }: { input: ServiceRecord }) => authClient.post('/mfa-settings', input),
    updateMfaSetting: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => authClient.put('/mfa-settings', id, input),
    deleteMfaSetting: (_: unknown, { id }: { id: string }) => authClient.delete('/mfa-settings', id),
    createActivityLog: (_: unknown, { input }: { input: ServiceRecord }) => authClient.post('/activity-logs', input),

    // Teams (Workforce Service)
    createTeam: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return workforceClient.post('/teams', input);
    },
    updateTeam: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => workforceClient.put('/teams', id, input),
    deleteTeam: (_: unknown, { id }: { id: string }) => workforceClient.delete('/teams', id),
    addTeamMember: async (_: unknown, { teamId, userId }: { teamId: string; userId: string }) => {
      // Add user to team
      await workforceClient.post('/team-members', {
        teamId,
        userId,
        role: 'member',
      });
      // Return updated team
      return workforceClient.getById('/teams', teamId);
    },
    removeTeamMember: async (_: unknown, { teamId, userId }: { teamId: string; userId: string }) => {
      // Find and delete the team member
      const teamMembers = await workforceClient.get(`/team-members?teamId=${teamId}&userId=${userId}`);
      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        await workforceClient.delete('/team-members', teamMembers[0].id);
      }
      // Return updated team
      return workforceClient.getById('/teams', teamId);
    },
    createTeamMember: (_: unknown, { input }: { input: ServiceRecord }) => workforceClient.post('/team-members', input),
    updateTeamMember: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => workforceClient.put('/team-members', id, input),
    deleteTeamMember: (_: unknown, { id }: { id: string }) => workforceClient.delete('/team-members', id),
    createUserSkill: (_: unknown, { input }: { input: ServiceRecord }) => workforceClient.post('/user-skills', input),
    updateUserSkill: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => workforceClient.put('/user-skills', id, input),
    deleteUserSkill: (_: unknown, { id }: { id: string }) => workforceClient.delete('/user-skills', id),
    createUserAvailability: (_: unknown, { input }: { input: ServiceRecord }) => workforceClient.post('/user-availability', input),
    updateUserAvailability: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => workforceClient.put('/user-availability', id, input),
    deleteUserAvailability: (_: unknown, { id }: { id: string }) => workforceClient.delete('/user-availability', id),

    // Projects (Project Service)
    createProject: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      const organizationId = input.organizationId || currentUser.organizationId;

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Transform input to match Prisma schema
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

      // Add contributors as project members if provided
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

      return project;
    },
    updateProject: async (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => {
      // Transform input to match Prisma schema
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

      // Handle metadata fields
      if (input.type !== undefined || input.visibility !== undefined ||
        input.notifyTeam !== undefined || input.notifyClient !== undefined) {
        // First get existing project to preserve other metadata
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
    deleteProject: (_: unknown, { id }: { id: string }) => projectClient.delete('/projects', id),
    createProjectMember: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/project-members', input),
    updateProjectMember: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => projectClient.put('/project-members', id, input),
    deleteProjectMember: (_: unknown, { id }: { id: string }) => projectClient.delete('/project-members', id),
    createTask: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/tasks', input),
    updateTask: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => projectClient.put('/tasks', id, input),
    deleteTask: (_: unknown, { id }: { id: string }) => projectClient.delete('/tasks', id),
    createTaskChecklist: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/task-checklists', input),
    updateTaskChecklist: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => projectClient.put('/task-checklists', id, input),
    deleteTaskChecklist: (_: unknown, { id }: { id: string }) => projectClient.delete('/task-checklists', id),
    createTaskDependency: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/task-dependencies', input),
    updateTaskDependency: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => projectClient.put('/task-dependencies', id, input),
    deleteTaskDependency: (_: unknown, { id }: { id: string }) => projectClient.delete('/task-dependencies', id),
    createMilestone: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/milestones', input),
    updateMilestone: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => projectClient.put('/milestones', id, input),
    deleteMilestone: (_: unknown, { id }: { id: string }) => projectClient.delete('/milestones', id),
    createRiskRegister: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/risk-register', input),
    updateRiskRegister: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => projectClient.put('/risk-register', id, input),
    deleteRiskRegister: (_: unknown, { id }: { id: string }) => projectClient.delete('/risk-register', id),
    createAiInsight: (_: unknown, { input }: { input: ServiceRecord }) => projectClient.post('/ai-insights', input),

    // Clients (Client Management Service)
    createClient: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return clientMgmtClient.post('/clients', input);
    },
    updateClient: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => clientMgmtClient.put('/clients', id, input),
    deleteClient: (_: unknown, { id }: { id: string }) => clientMgmtClient.delete('/clients', id),

    inviteClient: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      const currentUser = await requireAuth(context);

      const organizationId = input.organizationId || currentUser.organizationId;
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Get organization details
      let organization;
      try {
        organization = await authClient.getById('/organizations', organizationId);
      } catch {
        throw new Error('Organization not found');
      }

      // Check if client already exists by email
      let client;
      try {
        const clients = await clientMgmtClient.get('/clients');
        client = clients.find((c: ServiceRecord) => c.email === input.email);

        if (!client) {
          // Create new client
          client = await clientMgmtClient.post('/clients', {
            name: input.name,
            email: input.email,
            company: input.company,
            phone: input.phone,
            organizationId,
            portalAccess: true,
            status: 'active',
          });
        } else {
          // Enable portal access for existing client
          if (!client.portalAccess) {
            client = await clientMgmtClient.put('/clients', client.id, {
              portalAccess: true,
            });
          }
        }
      } catch {
        throw new Error('Failed to create or find client');
      }

      // If projectId provided, link client to project
      let projectName;
      if (input.projectId) {
        try {
          const project = await projectClient.getById('/projects', input.projectId);
          projectName = project?.name;

          // Create project-client relationship
          await clientMgmtClient.post('/project-clients', {
            projectId: input.projectId,
            clientId: client.id,
          });
        } catch {
          // Relationship might already exist
        }
      }

      // Send client portal invitation email
      try {
        const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
        const inviteToken = client.id;

        await notificationClient.post('/emails/invite/client', {
          email: input.email,
          inviterName,
          organizationName: organization.name,
          projectName,
          inviteToken,
          recipientName: input.name,
        });
      } catch (emailError) {
        console.error('Failed to send client invitation email:', emailError);
        // Don't fail if email fails
      }

      return client;
    },

    createProjectClient: (_: unknown, { input }: { input: ServiceRecord }) => clientMgmtClient.post('/project-clients', input),
    updateProjectClient: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => clientMgmtClient.put('/project-clients', id, input),
    deleteProjectClient: (_: unknown, { id }: { id: string }) => clientMgmtClient.delete('/project-clients', id),
    createClientFeedback: (_: unknown, { input }: { input: ServiceRecord }) => clientMgmtClient.post('/client-feedback', input),
    updateClientFeedback: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => clientMgmtClient.put('/client-feedback', id, input),
    deleteClientFeedback: (_: unknown, { id }: { id: string }) => clientMgmtClient.delete('/client-feedback', id),
    createProposal: (_: unknown, { input }: { input: ServiceRecord }) => clientMgmtClient.post('/proposals', input),
    updateProposal: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => clientMgmtClient.put('/proposals', id, input),
    deleteProposal: (_: unknown, { id }: { id: string }) => clientMgmtClient.delete('/proposals', id),

    // Documentation (Knowledge Hub Service)
    createWikiPage: (_: unknown, { input }: { input: ServiceRecord }) => knowledgeClient.post('/wiki-pages', input),
    updateWikiPage: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => knowledgeClient.put('/wiki-pages', id, input),
    deleteWikiPage: (_: unknown, { id }: { id: string }) => knowledgeClient.delete('/wiki-pages', id),
    createWikiPageVersion: (_: unknown, { input }: { input: ServiceRecord }) => knowledgeClient.post('/wiki-page-versions', input),
    createDocumentFolder: (_: unknown, { input }: { input: ServiceRecord }) => knowledgeClient.post('/document-folders', input),
    updateDocumentFolder: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => knowledgeClient.put('/document-folders', id, input),
    deleteDocumentFolder: (_: unknown, { id }: { id: string }) => knowledgeClient.delete('/document-folders', id),
    createDocument: (_: unknown, { input }: { input: ServiceRecord }) => knowledgeClient.post('/documents', input),
    updateDocument: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => knowledgeClient.put('/documents', id, input),
    deleteDocument: (_: unknown, { id }: { id: string }) => knowledgeClient.delete('/documents', id),
    createDocumentPermission: (_: unknown, { input }: { input: ServiceRecord }) => knowledgeClient.post('/document-permissions', input),
    updateDocumentPermission: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => knowledgeClient.put('/document-permissions', id, input),
    deleteDocumentPermission: (_: unknown, { id }: { id: string }) => knowledgeClient.delete('/document-permissions', id),
    createDocumentLink: (_: unknown, { input }: { input: ServiceRecord }) => knowledgeClient.post('/document-links', input),
    updateDocumentLink: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => knowledgeClient.put('/document-links', id, input),
    deleteDocumentLink: (_: unknown, { id }: { id: string }) => knowledgeClient.delete('/document-links', id),

    // Communication (Communication Service)
    createChatChannel: (_: unknown, { input }: { input: ServiceRecord }) => communicationClient.post('/chat-channels', input),
    updateChatChannel: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => communicationClient.put('/chat-channels', id, input),
    deleteChatChannel: (_: unknown, { id }: { id: string }) => communicationClient.delete('/chat-channels', id),
    createChannelMember: (_: unknown, { input }: { input: ServiceRecord }) => communicationClient.post('/channel-members', input),
    updateChannelMember: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => communicationClient.put('/channel-members', id, input),
    deleteChannelMember: (_: unknown, { id }: { id: string }) => communicationClient.delete('/channel-members', id),
    createChatMessage: (_: unknown, { input }: { input: ServiceRecord }) => communicationClient.post('/chat-messages', input),
    updateChatMessage: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => communicationClient.put('/chat-messages', id, input),
    deleteChatMessage: (_: unknown, { id }: { id: string }) => communicationClient.delete('/chat-messages', id),
    createMessageMention: (_: unknown, { input }: { input: ServiceRecord }) => communicationClient.post('/message-mentions', input),
    createMessageAttachment: (_: unknown, { input }: { input: ServiceRecord }) => communicationClient.post('/message-attachments', input),
    createCommunicationLog: (_: unknown, { input }: { input: ServiceRecord }) => communicationClient.post('/communication-logs', input),

    // AI & Automation (Monitoring Service)
    createAiConversation: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/ai-conversations', input),
    updateAiConversation: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/ai-conversations', id, input),
    deleteAiConversation: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/ai-conversations', id),
    createAutomationRule: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/automation-rules', input),
    updateAutomationRule: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/automation-rules', id, input),
    deleteAutomationRule: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/automation-rules', id),
    createAutomationLog: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/automation-logs', input),

    // Monitoring (Monitoring Service)
    createKpiDefinition: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/kpi-definitions', input),
    updateKpiDefinition: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/kpi-definitions', id, input),
    deleteKpiDefinition: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/kpi-definitions', id),
    createKpiMeasurement: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/kpi-measurements', input),
    createReportTemplate: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/report-templates', input),
    updateReportTemplate: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/report-templates', id, input),
    deleteReportTemplate: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/report-templates', id),
    createGeneratedReport: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/generated-reports', input),
    createMemberPerformance: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/member-performance', input),
    createDashboard: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/dashboards', input),
    updateDashboard: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/dashboards', id, input),
    deleteDashboard: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/dashboards', id),
    createDashboardWidget: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/dashboard-widgets', input),
    updateDashboardWidget: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/dashboard-widgets', id, input),
    deleteDashboardWidget: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/dashboard-widgets', id),

    // Report Schedules (Monitoring Service)
    createReportSchedule: (_: unknown, { input }: { input: ServiceRecord }) => monitoringClient.post('/report-schedules', input),
    updateReportSchedule: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => monitoringClient.put('/report-schedules', id, input),
    deleteReportSchedule: (_: unknown, { id }: { id: string }) => monitoringClient.delete('/report-schedules', id),

    // Notifications (Notification Service)
    createNotificationTemplate: (_: unknown, { input }: { input: ServiceRecord }) => notificationClient.post('/notification-templates', input),
    updateNotificationTemplate: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => notificationClient.put('/notification-templates', id, input),
    deleteNotificationTemplate: (_: unknown, { id }: { id: string }) => notificationClient.delete('/notification-templates', id),
    createNotificationPreference: (_: unknown, { input }: { input: ServiceRecord }) => notificationClient.post('/notification-preferences', input),
    updateNotificationPreference: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => notificationClient.put('/notification-preferences', id, input),
    deleteNotificationPreference: (_: unknown, { id }: { id: string }) => notificationClient.delete('/notification-preferences', id),
    createNotification: (_: unknown, { input }: { input: ServiceRecord }) => notificationClient.post('/notifications', input),
    updateNotification: (_: unknown, { id, input }: { id: string; input: ServiceRecord }) => notificationClient.put('/notifications', id, input),
    deleteNotification: (_: unknown, { id }: { id: string }) => notificationClient.delete('/notifications', id),
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
      // Use agent query endpoint for full agent capabilities (create/update/delete operations)
      return aiEngineClient.post('/api/agent/query', input);
    },
    aiClearHistory: async (_: unknown, { sessionId }: { sessionId: string }, context: Context) => {
      await requireAuth(context);
      await aiEngineClient.delete('/api/chat/history', sessionId);
      return { message: 'Conversation history cleared' };
    },
    aiSyncAll: async (_: unknown, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.post('/api/sync/all', { organizationId });
    },
    aiSyncType: async (_: unknown, { organizationId, type }: { organizationId: string; type: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.post(`/api/sync/${type}`, { organizationId });
    },
    aiIndexDocument: async (_: unknown, { input }: { input: ServiceRecord }, context: Context) => {
      await requireOrganization(context, input.organizationId);
      return aiEngineClient.post('/api/index/document', input);
    },
    aiRemoveDocument: async (_: unknown, { sourceSchema, sourceTable, sourceId }: { sourceSchema: string; sourceTable: string; sourceId: string }, context: Context) => {
      await requireAuth(context);
      return aiEngineClient.post('/api/index/document/remove', { sourceSchema, sourceTable, sourceId });
    },
  },
};
