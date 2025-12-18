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
} from '../services/backendClient';
import { requireAuth, requireAdmin, requireOrganization, AuthContext } from '../lib/auth';

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
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
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
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
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
  serialize(value: any) {
    return value ? parseFloat(value.toString()) : null;
  },
  parseValue(value: any) {
    return value ? parseFloat(value.toString()) : null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return parseFloat(ast.value);
    }
    return null;
  },
});

// Helper function to enrich user with workforce data
async function enrichUserWithWorkforceData(user: any): Promise<any> {
  if (!user) return null;

  try {
    // Get team membership for this user
    const teamMembers = await workforceClient.get(`/team-members?userId=${user.id}`);
    const teamMember = Array.isArray(teamMembers) ? teamMembers[0] : null;

    // Get skills for this user
    const userSkills = await workforceClient.get(`/user-skills?userId=${user.id}`);
    const skills = Array.isArray(userSkills) ? userSkills.map((s: any) => s.skillName) : [];

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
const userCache = new Map<string, any>();

// Helper to get enriched user by ID (with caching)
async function getEnrichedUser(userId: string): Promise<any> {
  if (userCache.has(userId)) {
    return userCache.get(userId);
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
    me: async (_: any, __: any, context: Context) => {
      if (!context.token) {
        throw new Error('Not authenticated');
      }
      return authClient.postWithAuth('/auth/me', {}, context.token);
    },

    // Users & Organizations (Auth Service)
    users: async (_: any, { organizationId }: { organizationId?: string }) => {
      const users = await authClient.get('/users');
      let filteredUsers = users;

      // If organizationId is provided, filter users by organization membership
      if (organizationId) {
        // Get organization members for this organization
        const members = await authClient.get(`/organization-members?organizationId=${organizationId}`);
        const memberUserIds = new Set(members.map((m: any) => m.userId));
        filteredUsers = users.filter((user: any) => memberUserIds.has(user.id));
      }

      return Promise.all(filteredUsers.map(enrichUserWithWorkforceData));
    },
    user: async (_: any, { id }: { id: string }) => {
      const user = await authClient.getById('/users', id);
      return enrichUserWithWorkforceData(user);
    },
    organizations: () => authClient.get('/organizations'),
    organization: (_: any, { id }: { id: string }) => authClient.getById('/organizations', id),
    organizationMembers: () => authClient.get('/organization-members'),
    organizationMember: (_: any, { id }: { id: string }) => authClient.getById('/organization-members', id),
    roles: () => authClient.get('/roles'),
    role: (_: any, { id }: { id: string }) => authClient.getById('/roles', id),
    kycData: () => authClient.get('/kyc-data'),
    kycDataById: (_: any, { id }: { id: string }) => authClient.getById('/kyc-data', id),
    mfaSettings: () => authClient.get('/mfa-settings'),
    mfaSetting: (_: any, { id }: { id: string }) => authClient.getById('/mfa-settings', id),
    activityLogs: () => authClient.get('/activity-logs'),
    activityLog: (_: any, { id }: { id: string }) => authClient.getById('/activity-logs', id),

    // Teams (Workforce Service)
    teams: (_: any, { organizationId }: { organizationId?: string }) => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      return workforceClient.get(`/teams?${params.toString()}`);
    },
    team: (_: any, { id }: { id: string }) => workforceClient.getById('/teams', id),
    teamMembers: () => workforceClient.get('/team-members'),
    teamMember: (_: any, { id }: { id: string }) => workforceClient.getById('/team-members', id),
    userSkills: () => workforceClient.get('/user-skills'),
    userSkill: (_: any, { id }: { id: string }) => workforceClient.getById('/user-skills', id),
    userAvailability: () => workforceClient.get('/user-availability'),
    userAvailabilityById: (_: any, { id }: { id: string }) => workforceClient.getById('/user-availability', id),

    // Projects (Project Service)
    projects: (_: any, { status, search, organizationId }: { status?: string; search?: string; organizationId?: string }) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (organizationId) params.append('organizationId', organizationId);
      return projectClient.get(`/projects?${params.toString()}`);
    },
    project: (_: any, { id }: { id: string }) => projectClient.getById('/projects', id),
    projectMembers: () => projectClient.get('/project-members'),
    projectMember: (_: any, { id }: { id: string }) => projectClient.getById('/project-members', id),
    tasks: () => projectClient.get('/tasks'),
    task: (_: any, { id }: { id: string }) => projectClient.getById('/tasks', id),
    taskChecklists: () => projectClient.get('/task-checklists'),
    taskChecklist: (_: any, { id }: { id: string }) => projectClient.getById('/task-checklists', id),
    taskDependencies: () => projectClient.get('/task-dependencies'),
    taskDependency: (_: any, { id }: { id: string }) => projectClient.getById('/task-dependencies', id),
    milestones: () => projectClient.get('/milestones'),
    milestone: (_: any, { id }: { id: string }) => projectClient.getById('/milestones', id),
    riskRegisters: () => projectClient.get('/risk-register'),
    riskRegister: (_: any, { id }: { id: string }) => projectClient.getById('/risk-register', id),
    aiInsights: () => projectClient.get('/ai-insights'),
    aiInsight: (_: any, { id }: { id: string }) => projectClient.getById('/ai-insights', id),

    // Clients (Client Management Service)
    clients: (_: any, { search, status, industry, organizationId }: { search?: string; status?: string; industry?: string; organizationId?: string }) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (industry) params.append('industry', industry);
      if (organizationId) params.append('organizationId', organizationId);
      return clientMgmtClient.get(`/clients?${params.toString()}`);
    },
    client: (_: any, { id }: { id: string }) => clientMgmtClient.getById('/clients', id),
    projectClients: () => clientMgmtClient.get('/project-clients'),
    projectClient: (_: any, { id }: { id: string }) => clientMgmtClient.getById('/project-clients', id),
    clientFeedbacks: () => clientMgmtClient.get('/client-feedback'),
    clientFeedback: (_: any, { id }: { id: string }) => clientMgmtClient.getById('/client-feedback', id),
    proposals: () => clientMgmtClient.get('/proposals'),
    proposal: (_: any, { id }: { id: string }) => clientMgmtClient.getById('/proposals', id),

    // Documentation (Knowledge Hub Service)
    wikiPages: () => knowledgeClient.get('/wiki-pages'),
    wikiPage: (_: any, { id }: { id: string }) => knowledgeClient.getById('/wiki-pages', id),
    wikiPageVersions: () => knowledgeClient.get('/wiki-page-versions'),
    wikiPageVersion: (_: any, { id }: { id: string }) => knowledgeClient.getById('/wiki-page-versions', id),
    documentFolders: () => knowledgeClient.get('/document-folders'),
    documentFolder: (_: any, { id }: { id: string }) => knowledgeClient.getById('/document-folders', id),
    documents: () => knowledgeClient.get('/documents'),
    document: (_: any, { id }: { id: string }) => knowledgeClient.getById('/documents', id),
    documentPermissions: () => knowledgeClient.get('/document-permissions'),
    documentPermission: (_: any, { id }: { id: string }) => knowledgeClient.getById('/document-permissions', id),
    documentLinks: () => knowledgeClient.get('/document-links'),
    documentLink: (_: any, { id }: { id: string }) => knowledgeClient.getById('/document-links', id),

    // Communication (Communication Service)
    chatChannels: () => communicationClient.get('/chat-channels'),
    chatChannel: (_: any, { id }: { id: string }) => communicationClient.getById('/chat-channels', id),
    channelMembers: () => communicationClient.get('/channel-members'),
    channelMember: (_: any, { id }: { id: string }) => communicationClient.getById('/channel-members', id),
    chatMessages: () => communicationClient.get('/chat-messages'),
    chatMessage: (_: any, { id }: { id: string }) => communicationClient.getById('/chat-messages', id),
    messageMentions: () => communicationClient.get('/message-mentions'),
    messageMention: (_: any, { id }: { id: string }) => communicationClient.getById('/message-mentions', id),
    messageAttachments: () => communicationClient.get('/message-attachments'),
    messageAttachment: (_: any, { id }: { id: string }) => communicationClient.getById('/message-attachments', id),
    communicationLogs: () => communicationClient.get('/communication-logs'),
    communicationLog: (_: any, { id }: { id: string }) => communicationClient.getById('/communication-logs', id),

    // AI & Automation (Monitoring Service)
    aiConversations: () => monitoringClient.get('/ai-conversations'),
    aiConversation: (_: any, { id }: { id: string }) => monitoringClient.getById('/ai-conversations', id),
    automationRules: () => monitoringClient.get('/automation-rules'),
    automationRule: (_: any, { id }: { id: string }) => monitoringClient.getById('/automation-rules', id),
    automationLogs: () => monitoringClient.get('/automation-logs'),
    automationLog: (_: any, { id }: { id: string }) => monitoringClient.getById('/automation-logs', id),

    // Monitoring (Monitoring Service)
    kpiDefinitions: () => monitoringClient.get('/kpi-definitions'),
    kpiDefinition: (_: any, { id }: { id: string }) => monitoringClient.getById('/kpi-definitions', id),
    kpiMeasurements: () => monitoringClient.get('/kpi-measurements'),
    kpiMeasurement: (_: any, { id }: { id: string }) => monitoringClient.getById('/kpi-measurements', id),
    reportTemplates: () => monitoringClient.get('/report-templates'),
    reportTemplate: (_: any, { id }: { id: string }) => monitoringClient.getById('/report-templates', id),
    generatedReports: () => monitoringClient.get('/generated-reports'),
    generatedReport: (_: any, { id }: { id: string }) => monitoringClient.getById('/generated-reports', id),
    memberPerformances: () => monitoringClient.get('/member-performance'),
    memberPerformance: (_: any, { id }: { id: string }) => monitoringClient.getById('/member-performance', id),
    dashboards: () => monitoringClient.get('/dashboards'),
    dashboard: (_: any, { id }: { id: string }) => monitoringClient.getById('/dashboards', id),
    dashboardWidgets: () => monitoringClient.get('/dashboard-widgets'),
    dashboardWidget: (_: any, { id }: { id: string }) => monitoringClient.getById('/dashboard-widgets', id),

    // Notifications (Notification Service)
    notificationTemplates: () => notificationClient.get('/notification-templates'),
    notificationTemplate: (_: any, { id }: { id: string }) => notificationClient.getById('/notification-templates', id),
    notificationPreferences: () => notificationClient.get('/notification-preferences'),
    notificationPreference: (_: any, { id }: { id: string }) => notificationClient.getById('/notification-preferences', id),
    notifications: () => notificationClient.get('/notifications'),
    notification: (_: any, { id }: { id: string }) => notificationClient.getById('/notifications', id),

    // AI Engine
    aiChatStats: async (_: any, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.get(`/api/chat/stats/${organizationId}`);
    },

    // Analytics & Dashboard
    myProjects: async (_: any, __: any, context: Context) => {
      const user = await requireAuth(context);
      try {
        // Get projects where the user is either:
        // 1. A project member
        // 2. A manager
        // 3. Associated as client contact
        const projectMembers = await projectClient.get(`/project-members?userId=${user.id}`);
        const projectIds = new Set<string>();

        if (Array.isArray(projectMembers)) {
          projectMembers.forEach((pm: any) => projectIds.add(pm.projectId));
        }

        // Also get projects where user is manager
        const managedProjects = await projectClient.get(`/projects?managerId=${user.id}`);
        if (Array.isArray(managedProjects)) {
          managedProjects.forEach((p: any) => projectIds.add(p.id));
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

    analyticsOverview: async (_: any, { organizationId, dateRange }: { organizationId: string; dateRange: { startDate: string; endDate: string } }, context: Context) => {
      await requireOrganization(context, organizationId);

      try {
        // Get all projects for the organization
        const projects = await projectClient.get(`/projects?organizationId=${organizationId}`);
        const projectArray = Array.isArray(projects) ? projects : [];

        // Get all tasks for these projects
        const allTasks: any[] = [];
        for (const project of projectArray) {
          try {
            const tasks = await projectClient.get(`/tasks?projectId=${project.id}`);
            if (Array.isArray(tasks)) allTasks.push(...tasks);
          } catch { /* ignore */ }
        }

        // Get all milestones
        const allMilestones: any[] = [];
        for (const project of projectArray) {
          try {
            const milestones = await projectClient.get(`/milestones?projectId=${project.id}`);
            if (Array.isArray(milestones)) allMilestones.push(...milestones);
          } catch { /* ignore */ }
        }

        // Get risk registers
        const allRisks: any[] = [];
        for (const project of projectArray) {
          try {
            const risks = await projectClient.get(`/risk-registers?projectId=${project.id}`);
            if (Array.isArray(risks)) allRisks.push(...risks);
          } catch { /* ignore */ }
        }

        // Calculate stats
        const totalProjects = projectArray.length;
        const activeProjects = projectArray.filter((p: any) => p.status === 'Active' || p.status === 'In Progress').length;
        const completedMilestones = allMilestones.filter((m: any) => m.completed || m.status === 'Completed').length;
        const identifiedRisks = allRisks.length;

        // Task distribution
        const taskStatusCounts: Record<string, number> = {};
        for (const task of allTasks) {
          const status = task.status || 'To Do';
          taskStatusCounts[status] = (taskStatusCounts[status] || 0) + 1;
        }
        const taskDistribution = Object.entries(taskStatusCounts).map(([status, count]) => ({ status, count }));

        // Calculate average productivity (completed tasks / total tasks * 100)
        const completedTasks = allTasks.filter((t: any) => t.status === 'Completed' || t.status === 'Done').length;
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

    dashboardStats: async (_: any, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);

      try {
        // Get all projects for the organization
        const projects = await projectClient.get(`/projects?organizationId=${organizationId}`);
        const projectArray = Array.isArray(projects) ? projects : [];

        const totalProjects = projectArray.length;
        const activeProjects = projectArray.filter((p: any) => p.status === 'Active' || p.status === 'In Progress').length;

        // Get all tasks
        let totalTasks = 0;
        let completedTasks = 0;
        const allMilestones: any[] = [];

        for (const project of projectArray) {
          try {
            const tasks = await projectClient.get(`/tasks?projectId=${project.id}`);
            if (Array.isArray(tasks)) {
              totalTasks += tasks.length;
              completedTasks += tasks.filter((t: any) => t.status === 'Completed' || t.status === 'Done').length;
            }
            const milestones = await projectClient.get(`/milestones?projectId=${project.id}`);
            if (Array.isArray(milestones)) {
              allMilestones.push(...milestones.map((m: any) => ({
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
          .filter((m: any) => !m.completed && m.status !== 'Completed' && new Date(m.dueDate) >= now)
          .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5)
          .map((m: any) => ({
            id: m.id,
            title: m.title || m.name,
            projectId: m.projectId,
            projectName: m.projectName,
            dueDate: m.dueDate,
          }));

        // Get recent activity logs
        let recentActivities: any[] = [];
        try {
          const activityLogs = await authClient.get('/activity-logs');
          if (Array.isArray(activityLogs)) {
            recentActivities = activityLogs
              .slice(0, 10)
              .map((log: any) => ({
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
        let teamUtilization: any[] = [];
        try {
          const teams = await workforceClient.get(`/teams?organizationId=${organizationId}`);
          if (Array.isArray(teams)) {
            teamUtilization = teams.slice(0, 5).map((team: any) => ({
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
    tasks: async (parent: any) => {
      try {
        return await projectClient.get(`/tasks?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    milestones: async (parent: any) => {
      try {
        return await projectClient.get(`/milestones?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
    client: async (parent: any) => {
      if (!parent.clientId) return null;
      try {
        return await clientMgmtClient.getById('/clients', parent.clientId);
      } catch {
        return null;
      }
    },
    manager: async (parent: any) => {
      if (!parent.managerId) return null;
      return getEnrichedUser(parent.managerId);
    },
    members: async (parent: any) => {
      try {
        // Get project members
        const projectMembers = await projectClient.get(`/project-members?projectId=${parent.id}`);
        if (!Array.isArray(projectMembers) || projectMembers.length === 0) return [];

        // Get user details for each member
        const members = await Promise.all(
          projectMembers.map((pm: any) => getEnrichedUser(pm.userId))
        );
        return members.filter(Boolean);
      } catch {
        return [];
      }
    },
    memberIds: async (parent: any) => {
      try {
        const projectMembers = await projectClient.get(`/project-members?projectId=${parent.id}`);
        return Array.isArray(projectMembers) ? projectMembers.map((pm: any) => pm.userId) : [];
      } catch {
        return [];
      }
    },
    teams: async (parent: any) => {
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
    activities: async (parent: any) => {
      try {
        // Get activity logs related to this project
        const activityLogs = await authClient.get(`/activity-logs?entityType=project&entityId=${parent.id}`);
        if (!Array.isArray(activityLogs)) return [];

        // Transform activity logs to ProjectActivity format
        const activities = await Promise.all(
          activityLogs.slice(0, 20).map(async (log: any) => {
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
    documents: async (parent: any) => {
      try {
        // Get documents linked to this project from knowledge hub
        const documents = await knowledgeClient.get(`/documents?projectId=${parent.id}`);
        if (!Array.isArray(documents)) return [];

        // Transform to ProjectDocument format
        const projectDocuments = await Promise.all(
          documents.map(async (doc: any) => {
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
    risks: async (parent: any) => {
      try {
        return await projectClient.get(`/risk-registers?projectId=${parent.id}`);
      } catch {
        return [];
      }
    },
  },

  Task: {
    priority: (parent: any) => parent.priority ?? 'medium',
    assignees: async (parent: any) => {
      // If there's an assigneeId, return that user as a single-element array
      if (parent.assigneeId) {
        const user = await getEnrichedUser(parent.assigneeId);
        return user ? [user] : [];
      }
      return [];
    },
    creator: async (parent: any) => {
      if (!parent.creatorId) return null;
      return getEnrichedUser(parent.creatorId);
    },
  },

  Milestone: {
    name: (parent: any) => parent.name ?? parent.title,
    completed: (parent: any) => parent.completed ?? (parent.status === 'completed'),
    completedAt: (parent: any) => parent.completedAt ?? null,
    dueDate: (parent: any) => parent.dueDate ?? new Date(),
  },

  Client: {
    email: (parent: any) => parent.email ?? parent.contactInfo?.email ?? null,
    company: (parent: any) => parent.company ?? parent.contactInfo?.company ?? null,
    phone: (parent: any) => parent.phone ?? parent.contactInfo?.phone ?? null,
    address: (parent: any) => parent.address ?? parent.contactInfo?.address ?? null,
    industry: (parent: any) => parent.industry ?? null,
    status: (parent: any) => parent.status ?? 'active',
    rating: async (parent: any) => {
      try {
        // Calculate rating from client feedback
        const feedbacks = await clientMgmtClient.get(`/client-feedback?clientId=${parent.id}`);
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
          return null;
        }
        const ratings = feedbacks.filter((f: any) => f.rating != null);
        if (ratings.length === 0) return null;
        const avgRating = ratings.reduce((sum: number, f: any) => sum + f.rating, 0) / ratings.length;
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
    projects: async (parent: any) => {
      try {
        const projectClients = await clientMgmtClient.get(`/project-clients?clientId=${parent.id}`);
        if (!Array.isArray(projectClients) || projectClients.length === 0) return [];
        const projects = await Promise.all(
          projectClients.map((pc: any) => projectClient.getById('/projects', pc.projectId).catch(() => null))
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
    contactPerson: async (parent: any) => {
      if (!parent.contactPersonId) return null;
      return getEnrichedUser(parent.contactPersonId);
    },
  },

  // User resolver to handle enrichment for any User type returned
  User: {
    role: (parent: any) => parent.role ?? null,
    avatar: (parent: any) => parent.avatar ?? parent.avatarUrl ?? null,
    status: (parent: any) => parent.status ?? 'active',
    skills: (parent: any) => parent.skills ?? [],
    teamId: (parent: any) => parent.teamId ?? null,
    joinedAt: (parent: any) => parent.joinedAt ?? parent.createdAt,
    team: async (parent: any) => {
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
    login: async (_: any, { email, password }: { email: string; password: string }) => {
      return authClient.post('/auth/login', { email, password });
    },
    register: async (_: any, { name, email, password, organizationName }: { name: string; email: string; password: string; organizationName?: string }) => {
      return authClient.post('/auth/register', { name, email, password, organizationName });
    },
    googleLogin: async (_: any, { idToken }: { idToken: string }) => {
      return authClient.post('/auth/google', { idToken });
    },
    googleSignup: async (_: any, { idToken }: { idToken: string }) => {
      return authClient.post('/auth/google', { idToken });
    },
    refreshToken: async (_: any, { refreshToken }: { refreshToken: string }) => {
      return authClient.post('/auth/refresh', { refreshToken });
    },
    logout: async (_: any, __: any, context: Context) => {
      if (!context.token) {
        return true;
      }
      return authClient.postWithAuth('/auth/logout', {}, context.token);
    },

    // Accept invitation and complete onboarding
    acceptInvite: async (_: any, { token, password, name, role }: { token: string; password: string; name: string; role?: string }) => {
      // Call auth service to accept the invitation
      return authClient.post('/auth/accept-invite', { token, password, name, role });
    },

    /**
     * Delete the currently authenticated user's account and all associated data.
     * If the user is an Admin (organizer) of an organization, the entire organization
     * and all its data (including other members) will be deleted.
     */
    deleteMyAccount: async (_: any, __: any, context: Context) => {
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
    removeMember: async (_: any, { teamId, memberId }: { teamId: string; memberId: string }) => {
      return workforceClient.post('/teams/remove-member', { teamId, memberId });
    },

    // Users & Organizations (Auth Service)
    createUser: async (_: any, { input }: { input: any }, context: Context) => {
      // Only Admins can create users
      const currentUser = await requireAdmin(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return authClient.post('/users', input);
    },
    updateUser: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/users', id, input),
    updateUserRole: async (_: any, { userId, role }: { userId: string; role: string }, context: Context) => {
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
        ? roles.find((r: any) => r.name.toLowerCase() === role.toLowerCase())
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
    deleteUser: (_: any, { id }: { id: string }) => authClient.delete('/users', id),
    inviteMember: async (_: any, { input }: { input: any }, context: Context) => {
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
        user = users.find((u: any) => u.email === input.email);

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
            ? roles.find((r: any) => r.name.toLowerCase() === input.role.toLowerCase())
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
    createOrganization: (_: any, { input }: { input: any }) => authClient.post('/organizations', input),
    updateOrganization: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/organizations', id, input),
    deleteOrganization: (_: any, { id }: { id: string }) => authClient.delete('/organizations', id),
    createOrganizationMember: (_: any, { input }: { input: any }) => authClient.post('/organization-members', input),
    updateOrganizationMember: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/organization-members', id, input),
    deleteOrganizationMember: (_: any, { id }: { id: string }) => authClient.delete('/organization-members', id),
    createRole: (_: any, { input }: { input: any }) => authClient.post('/roles', input),
    updateRole: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/roles', id, input),
    deleteRole: (_: any, { id }: { id: string }) => authClient.delete('/roles', id),
    createKycData: (_: any, { input }: { input: any }) => authClient.post('/kyc-data', input),
    updateKycData: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/kyc-data', id, input),
    deleteKycData: (_: any, { id }: { id: string }) => authClient.delete('/kyc-data', id),
    createMfaSetting: (_: any, { input }: { input: any }) => authClient.post('/mfa-settings', input),
    updateMfaSetting: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/mfa-settings', id, input),
    deleteMfaSetting: (_: any, { id }: { id: string }) => authClient.delete('/mfa-settings', id),
    createActivityLog: (_: any, { input }: { input: any }) => authClient.post('/activity-logs', input),

    // Teams (Workforce Service)
    createTeam: async (_: any, { input }: { input: any }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return workforceClient.post('/teams', input);
    },
    updateTeam: (_: any, { id, input }: { id: string; input: any }) => workforceClient.put('/teams', id, input),
    deleteTeam: (_: any, { id }: { id: string }) => workforceClient.delete('/teams', id),
    addTeamMember: async (_: any, { teamId, userId }: { teamId: string; userId: string }) => {
      // Add user to team
      await workforceClient.post('/team-members', {
        teamId,
        userId,
        role: 'member',
      });
      // Return updated team
      return workforceClient.getById('/teams', teamId);
    },
    removeTeamMember: async (_: any, { teamId, userId }: { teamId: string; userId: string }) => {
      // Find and delete the team member
      const teamMembers = await workforceClient.get(`/team-members?teamId=${teamId}&userId=${userId}`);
      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        await workforceClient.delete('/team-members', teamMembers[0].id);
      }
      // Return updated team
      return workforceClient.getById('/teams', teamId);
    },
    createTeamMember: (_: any, { input }: { input: any }) => workforceClient.post('/team-members', input),
    updateTeamMember: (_: any, { id, input }: { id: string; input: any }) => workforceClient.put('/team-members', id, input),
    deleteTeamMember: (_: any, { id }: { id: string }) => workforceClient.delete('/team-members', id),
    createUserSkill: (_: any, { input }: { input: any }) => workforceClient.post('/user-skills', input),
    updateUserSkill: (_: any, { id, input }: { id: string; input: any }) => workforceClient.put('/user-skills', id, input),
    deleteUserSkill: (_: any, { id }: { id: string }) => workforceClient.delete('/user-skills', id),
    createUserAvailability: (_: any, { input }: { input: any }) => workforceClient.post('/user-availability', input),
    updateUserAvailability: (_: any, { id, input }: { id: string; input: any }) => workforceClient.put('/user-availability', id, input),
    deleteUserAvailability: (_: any, { id }: { id: string }) => workforceClient.delete('/user-availability', id),

    // Projects (Project Service)
    createProject: async (_: any, { input }: { input: any }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      const organizationId = input.organizationId || currentUser.organizationId;

      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      // Transform input to match Prisma schema
      const projectData: any = {
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
    updateProject: async (_: any, { id, input }: { id: string; input: any }) => {
      // Transform input to match Prisma schema
      const projectData: any = {};

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
    deleteProject: (_: any, { id }: { id: string }) => projectClient.delete('/projects', id),
    createProjectMember: (_: any, { input }: { input: any }) => projectClient.post('/project-members', input),
    updateProjectMember: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/project-members', id, input),
    deleteProjectMember: (_: any, { id }: { id: string }) => projectClient.delete('/project-members', id),
    createTask: (_: any, { input }: { input: any }) => projectClient.post('/tasks', input),
    updateTask: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/tasks', id, input),
    deleteTask: (_: any, { id }: { id: string }) => projectClient.delete('/tasks', id),
    createTaskChecklist: (_: any, { input }: { input: any }) => projectClient.post('/task-checklists', input),
    updateTaskChecklist: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/task-checklists', id, input),
    deleteTaskChecklist: (_: any, { id }: { id: string }) => projectClient.delete('/task-checklists', id),
    createTaskDependency: (_: any, { input }: { input: any }) => projectClient.post('/task-dependencies', input),
    updateTaskDependency: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/task-dependencies', id, input),
    deleteTaskDependency: (_: any, { id }: { id: string }) => projectClient.delete('/task-dependencies', id),
    createMilestone: (_: any, { input }: { input: any }) => projectClient.post('/milestones', input),
    updateMilestone: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/milestones', id, input),
    deleteMilestone: (_: any, { id }: { id: string }) => projectClient.delete('/milestones', id),
    createRiskRegister: (_: any, { input }: { input: any }) => projectClient.post('/risk-register', input),
    updateRiskRegister: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/risk-register', id, input),
    deleteRiskRegister: (_: any, { id }: { id: string }) => projectClient.delete('/risk-register', id),
    createAiInsight: (_: any, { input }: { input: any }) => projectClient.post('/ai-insights', input),

    // Clients (Client Management Service)
    createClient: async (_: any, { input }: { input: any }, context: Context) => {
      const currentUser = await requireAuth(context);

      // Auto-assign organizationId from current user if not provided
      if (!input.organizationId && currentUser.organizationId) {
        input.organizationId = currentUser.organizationId;
      }

      return clientMgmtClient.post('/clients', input);
    },
    updateClient: (_: any, { id, input }: { id: string; input: any }) => clientMgmtClient.put('/clients', id, input),
    deleteClient: (_: any, { id }: { id: string }) => clientMgmtClient.delete('/clients', id),

    inviteClient: async (_: any, { input }: { input: any }, context: Context) => {
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
        client = clients.find((c: any) => c.email === input.email);

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

    createProjectClient: (_: any, { input }: { input: any }) => clientMgmtClient.post('/project-clients', input),
    updateProjectClient: (_: any, { id, input }: { id: string; input: any }) => clientMgmtClient.put('/project-clients', id, input),
    deleteProjectClient: (_: any, { id }: { id: string }) => clientMgmtClient.delete('/project-clients', id),
    createClientFeedback: (_: any, { input }: { input: any }) => clientMgmtClient.post('/client-feedback', input),
    updateClientFeedback: (_: any, { id, input }: { id: string; input: any }) => clientMgmtClient.put('/client-feedback', id, input),
    deleteClientFeedback: (_: any, { id }: { id: string }) => clientMgmtClient.delete('/client-feedback', id),
    createProposal: (_: any, { input }: { input: any }) => clientMgmtClient.post('/proposals', input),
    updateProposal: (_: any, { id, input }: { id: string; input: any }) => clientMgmtClient.put('/proposals', id, input),
    deleteProposal: (_: any, { id }: { id: string }) => clientMgmtClient.delete('/proposals', id),

    // Documentation (Knowledge Hub Service)
    createWikiPage: (_: any, { input }: { input: any }) => knowledgeClient.post('/wiki-pages', input),
    updateWikiPage: (_: any, { id, input }: { id: string; input: any }) => knowledgeClient.put('/wiki-pages', id, input),
    deleteWikiPage: (_: any, { id }: { id: string }) => knowledgeClient.delete('/wiki-pages', id),
    createWikiPageVersion: (_: any, { input }: { input: any }) => knowledgeClient.post('/wiki-page-versions', input),
    createDocumentFolder: (_: any, { input }: { input: any }) => knowledgeClient.post('/document-folders', input),
    updateDocumentFolder: (_: any, { id, input }: { id: string; input: any }) => knowledgeClient.put('/document-folders', id, input),
    deleteDocumentFolder: (_: any, { id }: { id: string }) => knowledgeClient.delete('/document-folders', id),
    createDocument: (_: any, { input }: { input: any }) => knowledgeClient.post('/documents', input),
    updateDocument: (_: any, { id, input }: { id: string; input: any }) => knowledgeClient.put('/documents', id, input),
    deleteDocument: (_: any, { id }: { id: string }) => knowledgeClient.delete('/documents', id),
    createDocumentPermission: (_: any, { input }: { input: any }) => knowledgeClient.post('/document-permissions', input),
    updateDocumentPermission: (_: any, { id, input }: { id: string; input: any }) => knowledgeClient.put('/document-permissions', id, input),
    deleteDocumentPermission: (_: any, { id }: { id: string }) => knowledgeClient.delete('/document-permissions', id),
    createDocumentLink: (_: any, { input }: { input: any }) => knowledgeClient.post('/document-links', input),
    updateDocumentLink: (_: any, { id, input }: { id: string; input: any }) => knowledgeClient.put('/document-links', id, input),
    deleteDocumentLink: (_: any, { id }: { id: string }) => knowledgeClient.delete('/document-links', id),

    // Communication (Communication Service)
    createChatChannel: (_: any, { input }: { input: any }) => communicationClient.post('/chat-channels', input),
    updateChatChannel: (_: any, { id, input }: { id: string; input: any }) => communicationClient.put('/chat-channels', id, input),
    deleteChatChannel: (_: any, { id }: { id: string }) => communicationClient.delete('/chat-channels', id),
    createChannelMember: (_: any, { input }: { input: any }) => communicationClient.post('/channel-members', input),
    updateChannelMember: (_: any, { id, input }: { id: string; input: any }) => communicationClient.put('/channel-members', id, input),
    deleteChannelMember: (_: any, { id }: { id: string }) => communicationClient.delete('/channel-members', id),
    createChatMessage: (_: any, { input }: { input: any }) => communicationClient.post('/chat-messages', input),
    updateChatMessage: (_: any, { id, input }: { id: string; input: any }) => communicationClient.put('/chat-messages', id, input),
    deleteChatMessage: (_: any, { id }: { id: string }) => communicationClient.delete('/chat-messages', id),
    createMessageMention: (_: any, { input }: { input: any }) => communicationClient.post('/message-mentions', input),
    createMessageAttachment: (_: any, { input }: { input: any }) => communicationClient.post('/message-attachments', input),
    createCommunicationLog: (_: any, { input }: { input: any }) => communicationClient.post('/communication-logs', input),

    // AI & Automation (Monitoring Service)
    createAiConversation: (_: any, { input }: { input: any }) => monitoringClient.post('/ai-conversations', input),
    updateAiConversation: (_: any, { id, input }: { id: string; input: any }) => monitoringClient.put('/ai-conversations', id, input),
    deleteAiConversation: (_: any, { id }: { id: string }) => monitoringClient.delete('/ai-conversations', id),
    createAutomationRule: (_: any, { input }: { input: any }) => monitoringClient.post('/automation-rules', input),
    updateAutomationRule: (_: any, { id, input }: { id: string; input: any }) => monitoringClient.put('/automation-rules', id, input),
    deleteAutomationRule: (_: any, { id }: { id: string }) => monitoringClient.delete('/automation-rules', id),
    createAutomationLog: (_: any, { input }: { input: any }) => monitoringClient.post('/automation-logs', input),

    // Monitoring (Monitoring Service)
    createKpiDefinition: (_: any, { input }: { input: any }) => monitoringClient.post('/kpi-definitions', input),
    updateKpiDefinition: (_: any, { id, input }: { id: string; input: any }) => monitoringClient.put('/kpi-definitions', id, input),
    deleteKpiDefinition: (_: any, { id }: { id: string }) => monitoringClient.delete('/kpi-definitions', id),
    createKpiMeasurement: (_: any, { input }: { input: any }) => monitoringClient.post('/kpi-measurements', input),
    createReportTemplate: (_: any, { input }: { input: any }) => monitoringClient.post('/report-templates', input),
    updateReportTemplate: (_: any, { id, input }: { id: string; input: any }) => monitoringClient.put('/report-templates', id, input),
    deleteReportTemplate: (_: any, { id }: { id: string }) => monitoringClient.delete('/report-templates', id),
    createGeneratedReport: (_: any, { input }: { input: any }) => monitoringClient.post('/generated-reports', input),
    createMemberPerformance: (_: any, { input }: { input: any }) => monitoringClient.post('/member-performance', input),
    createDashboard: (_: any, { input }: { input: any }) => monitoringClient.post('/dashboards', input),
    updateDashboard: (_: any, { id, input }: { id: string; input: any }) => monitoringClient.put('/dashboards', id, input),
    deleteDashboard: (_: any, { id }: { id: string }) => monitoringClient.delete('/dashboards', id),
    createDashboardWidget: (_: any, { input }: { input: any }) => monitoringClient.post('/dashboard-widgets', input),
    updateDashboardWidget: (_: any, { id, input }: { id: string; input: any }) => monitoringClient.put('/dashboard-widgets', id, input),
    deleteDashboardWidget: (_: any, { id }: { id: string }) => monitoringClient.delete('/dashboard-widgets', id),

    // Notifications (Notification Service)
    createNotificationTemplate: (_: any, { input }: { input: any }) => notificationClient.post('/notification-templates', input),
    updateNotificationTemplate: (_: any, { id, input }: { id: string; input: any }) => notificationClient.put('/notification-templates', id, input),
    deleteNotificationTemplate: (_: any, { id }: { id: string }) => notificationClient.delete('/notification-templates', id),
    createNotificationPreference: (_: any, { input }: { input: any }) => notificationClient.post('/notification-preferences', input),
    updateNotificationPreference: (_: any, { id, input }: { id: string; input: any }) => notificationClient.put('/notification-preferences', id, input),
    deleteNotificationPreference: (_: any, { id }: { id: string }) => notificationClient.delete('/notification-preferences', id),
    createNotification: (_: any, { input }: { input: any }) => notificationClient.post('/notifications', input),
    updateNotification: (_: any, { id, input }: { id: string; input: any }) => notificationClient.put('/notifications', id, input),
    deleteNotification: (_: any, { id }: { id: string }) => notificationClient.delete('/notifications', id),
    markNotificationAsRead: async (_: any, { id }: { id: string }, context: Context) => {
      await requireAuth(context);
      return notificationClient.put('/notifications', id, { isRead: true });
    },
    markAllNotificationsAsRead: async (_: any, __: unknown, context: Context) => {
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
    aiChat: async (_: any, { input }: { input: any }, context: Context) => {
      await validateAiRequest(context, input.organizationId, input.userId);
      // Use agent query endpoint for full agent capabilities (create/update/delete operations)
      return aiEngineClient.post('/api/agent/query', input);
    },
    aiClearHistory: async (_: any, { sessionId }: { sessionId: string }, context: Context) => {
      await requireAuth(context);
      await aiEngineClient.delete('/api/chat/history', sessionId);
      return { message: 'Conversation history cleared' };
    },
    aiSyncAll: async (_: any, { organizationId }: { organizationId: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.post('/api/sync/all', { organizationId });
    },
    aiSyncType: async (_: any, { organizationId, type }: { organizationId: string; type: string }, context: Context) => {
      await requireOrganization(context, organizationId);
      return aiEngineClient.post(`/api/sync/${type}`, { organizationId });
    },
    aiIndexDocument: async (_: any, { input }: { input: any }, context: Context) => {
      await requireOrganization(context, input.organizationId);
      return aiEngineClient.post('/api/index/document', input);
    },
    aiRemoveDocument: async (_: any, { sourceSchema, sourceTable, sourceId }: { sourceSchema: string; sourceTable: string; sourceId: string }, context: Context) => {
      await requireAuth(context);
      return aiEngineClient.post('/api/index/document/remove', { sourceSchema, sourceTable, sourceId });
    },
  },
};
