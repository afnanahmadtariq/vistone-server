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
} from '../services/backendClient';

interface Context {
  headers: Record<string, string | string[] | undefined>;
  token?: string;
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
    users: () => authClient.get('/users'),
    user: (_: any, { id }: { id: string }) => authClient.getById('/users', id),
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
    teams: () => workforceClient.get('/teams'),
    team: (_: any, { id }: { id: string }) => workforceClient.getById('/teams', id),
    teamMembers: () => workforceClient.get('/team-members'),
    teamMember: (_: any, { id }: { id: string }) => workforceClient.getById('/team-members', id),
    userSkills: () => workforceClient.get('/user-skills'),
    userSkill: (_: any, { id }: { id: string }) => workforceClient.getById('/user-skills', id),
    userAvailability: () => workforceClient.get('/user-availability'),
    userAvailabilityById: (_: any, { id }: { id: string }) => workforceClient.getById('/user-availability', id),

    // Projects (Project Service)
    projects: (_: any, { status, search }: { status?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (search) params.append('search', search);
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
    clients: () => clientMgmtClient.get('/clients'),
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
  },

  Project: {
    tasks: (parent: any) => projectClient.get(`/tasks?projectId=${parent.id}`),
    milestones: (parent: any) => projectClient.get(`/milestones?projectId=${parent.id}`),
    client: (parent: any) => parent.clientId ? clientMgmtClient.getById('/clients', parent.clientId) : null,
    manager: (parent: any) => parent.managerId ? authClient.getById('/users', parent.managerId) : null,
  },

  Mutation: {
    // Authentication
    login: async (_: any, { email, password }: { email: string; password: string }) => {
      return authClient.post('/auth/login', { email, password });
    },
    register: async (_: any, { name, email, password }: { name: string; email: string; password: string }) => {
      return authClient.post('/auth/register', { name, email, password });
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
    createUser: (_: any, { input }: { input: any }) => authClient.post('/users', input),
    updateUser: (_: any, { id, input }: { id: string; input: any }) => authClient.put('/users', id, input),
    deleteUser: (_: any, { id }: { id: string }) => authClient.delete('/users', id),
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
    createTeam: (_: any, { input }: { input: any }) => workforceClient.post('/teams', input),
    updateTeam: (_: any, { id, input }: { id: string; input: any }) => workforceClient.put('/teams', id, input),
    deleteTeam: (_: any, { id }: { id: string }) => workforceClient.delete('/teams', id),
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
    createProject: (_: any, { input }: { input: any }) => projectClient.post('/projects', input),
    updateProject: (_: any, { id, input }: { id: string; input: any }) => projectClient.put('/projects', id, input),
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
    createClient: (_: any, { input }: { input: any }) => clientMgmtClient.post('/clients', input),
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
  },
};
