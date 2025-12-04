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
    deleteUser: (_: any, { id }: { id: string }) => authClient.delete('/users', id),
    inviteMember: async (_: any, { input }: { input: any }, context: Context) => {
      const currentUser = await requireAuth(context);
      
      // Use organizationId from input or current user
      const organizationId = input.organizationId || currentUser.organizationId;
      if (!organizationId) {
        throw new Error('Organization ID is required');
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
      
      // Add user to organization as a member
      try {
        await authClient.post('/organization-members', {
          userId: user.id,
          organizationId,
          roleId: null, // Default role
        });
      } catch {
        // User might already be a member, continue
      }
      
      // If teamId provided, add user to team
      if (input.teamId) {
        try {
          await workforceClient.post('/team-members', {
            teamId: input.teamId,
            userId: user.id,
            role: input.role || 'member',
          });
        } catch {
          // Team membership might already exist
        }
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

    // AI Engine
    aiChat: async (_: any, { input }: { input: any }, context: Context) => {
      await validateAiRequest(context, input.organizationId, input.userId);
      return aiEngineClient.post('/api/chat', input);
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
