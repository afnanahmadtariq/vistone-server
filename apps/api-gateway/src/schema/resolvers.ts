import { GraphQLScalarType, Kind } from 'graphql';
import backendClient from '../services/backendClient';

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
    // Users & Organizations
    users: () => backendClient.get('/users'),
    user: (_: any, { id }: { id: string }) => backendClient.getById('/users', id),
    organizations: () => backendClient.get('/organizations'),
    organization: (_: any, { id }: { id: string }) => backendClient.getById('/organizations', id),
    organizationMembers: () => backendClient.get('/organization-members'),
    organizationMember: (_: any, { id }: { id: string }) => backendClient.getById('/organization-members', id),
    roles: () => backendClient.get('/roles'),
    role: (_: any, { id }: { id: string }) => backendClient.getById('/roles', id),
    kycData: () => backendClient.get('/kyc-data'),
    kycDataById: (_: any, { id }: { id: string }) => backendClient.getById('/kyc-data', id),
    mfaSettings: () => backendClient.get('/mfa-settings'),
    mfaSetting: (_: any, { id }: { id: string }) => backendClient.getById('/mfa-settings', id),
    activityLogs: () => backendClient.get('/activity-logs'),
    activityLog: (_: any, { id }: { id: string }) => backendClient.getById('/activity-logs', id),

    // Teams
    teams: () => backendClient.get('/teams'),
    team: (_: any, { id }: { id: string }) => backendClient.getById('/teams', id),
    teamMembers: () => backendClient.get('/team-members'),
    teamMember: (_: any, { id }: { id: string }) => backendClient.getById('/team-members', id),
    userSkills: () => backendClient.get('/user-skills'),
    userSkill: (_: any, { id }: { id: string }) => backendClient.getById('/user-skills', id),
    userAvailability: () => backendClient.get('/user-availability'),
    userAvailabilityById: (_: any, { id }: { id: string }) => backendClient.getById('/user-availability', id),

    // Projects
    projects: () => backendClient.get('/projects'),
    project: (_: any, { id }: { id: string }) => backendClient.getById('/projects', id),
    projectMembers: () => backendClient.get('/project-members'),
    projectMember: (_: any, { id }: { id: string }) => backendClient.getById('/project-members', id),
    tasks: () => backendClient.get('/tasks'),
    task: (_: any, { id }: { id: string }) => backendClient.getById('/tasks', id),
    taskChecklists: () => backendClient.get('/task-checklists'),
    taskChecklist: (_: any, { id }: { id: string }) => backendClient.getById('/task-checklists', id),
    taskDependencies: () => backendClient.get('/task-dependencies'),
    taskDependency: (_: any, { id }: { id: string }) => backendClient.getById('/task-dependencies', id),
    milestones: () => backendClient.get('/milestones'),
    milestone: (_: any, { id }: { id: string }) => backendClient.getById('/milestones', id),
    riskRegisters: () => backendClient.get('/risk-register'),
    riskRegister: (_: any, { id }: { id: string }) => backendClient.getById('/risk-register', id),

    // Clients
    clients: () => backendClient.get('/clients'),
    client: (_: any, { id }: { id: string }) => backendClient.getById('/clients', id),
    projectClients: () => backendClient.get('/project-clients'),
    projectClient: (_: any, { id }: { id: string }) => backendClient.getById('/project-clients', id),
    clientFeedbacks: () => backendClient.get('/client-feedback'),
    clientFeedback: (_: any, { id }: { id: string }) => backendClient.getById('/client-feedback', id),
    proposals: () => backendClient.get('/proposals'),
    proposal: (_: any, { id }: { id: string }) => backendClient.getById('/proposals', id),

    // Documentation
    wikiPages: () => backendClient.get('/wiki-pages'),
    wikiPage: (_: any, { id }: { id: string }) => backendClient.getById('/wiki-pages', id),
    wikiPageVersions: () => backendClient.get('/wiki-page-versions'),
    wikiPageVersion: (_: any, { id }: { id: string }) => backendClient.getById('/wiki-page-versions', id),
    documentFolders: () => backendClient.get('/document-folders'),
    documentFolder: (_: any, { id }: { id: string }) => backendClient.getById('/document-folders', id),
    documents: () => backendClient.get('/documents'),
    document: (_: any, { id }: { id: string }) => backendClient.getById('/documents', id),
    documentPermissions: () => backendClient.get('/document-permissions'),
    documentPermission: (_: any, { id }: { id: string }) => backendClient.getById('/document-permissions', id),
    documentLinks: () => backendClient.get('/document-links'),
    documentLink: (_: any, { id }: { id: string }) => backendClient.getById('/document-links', id),

    // Communication
    chatChannels: () => backendClient.get('/chat-channels'),
    chatChannel: (_: any, { id }: { id: string }) => backendClient.getById('/chat-channels', id),
    channelMembers: () => backendClient.get('/channel-members'),
    channelMember: (_: any, { id }: { id: string }) => backendClient.getById('/channel-members', id),
    chatMessages: () => backendClient.get('/chat-messages'),
    chatMessage: (_: any, { id }: { id: string }) => backendClient.getById('/chat-messages', id),
    messageMentions: () => backendClient.get('/message-mentions'),
    messageMention: (_: any, { id }: { id: string }) => backendClient.getById('/message-mentions', id),
    messageAttachments: () => backendClient.get('/message-attachments'),
    messageAttachment: (_: any, { id }: { id: string }) => backendClient.getById('/message-attachments', id),
    communicationLogs: () => backendClient.get('/communication-logs'),
    communicationLog: (_: any, { id }: { id: string }) => backendClient.getById('/communication-logs', id),

    // AI & Automation
    aiConversations: () => backendClient.get('/ai-conversations'),
    aiConversation: (_: any, { id }: { id: string }) => backendClient.getById('/ai-conversations', id),
    aiInsights: () => backendClient.get('/ai-insights'),
    aiInsight: (_: any, { id }: { id: string }) => backendClient.getById('/ai-insights', id),
    automationRules: () => backendClient.get('/automation-rules'),
    automationRule: (_: any, { id }: { id: string }) => backendClient.getById('/automation-rules', id),
    automationLogs: () => backendClient.get('/automation-logs'),
    automationLog: (_: any, { id }: { id: string }) => backendClient.getById('/automation-logs', id),

    // Monitoring
    kpiDefinitions: () => backendClient.get('/kpi-definitions'),
    kpiDefinition: (_: any, { id }: { id: string }) => backendClient.getById('/kpi-definitions', id),
    kpiMeasurements: () => backendClient.get('/kpi-measurements'),
    kpiMeasurement: (_: any, { id }: { id: string }) => backendClient.getById('/kpi-measurements', id),
    reportTemplates: () => backendClient.get('/report-templates'),
    reportTemplate: (_: any, { id }: { id: string }) => backendClient.getById('/report-templates', id),
    generatedReports: () => backendClient.get('/generated-reports'),
    generatedReport: (_: any, { id }: { id: string }) => backendClient.getById('/generated-reports', id),
    memberPerformances: () => backendClient.get('/member-performance'),
    memberPerformance: (_: any, { id }: { id: string }) => backendClient.getById('/member-performance', id),

    // Notifications
    notificationTemplates: () => backendClient.get('/notification-templates'),
    notificationTemplate: (_: any, { id }: { id: string }) => backendClient.getById('/notification-templates', id),
    notificationPreferences: () => backendClient.get('/notification-preferences'),
    notificationPreference: (_: any, { id }: { id: string }) => backendClient.getById('/notification-preferences', id),
    notifications: () => backendClient.get('/notifications'),
    notification: (_: any, { id }: { id: string }) => backendClient.getById('/notifications', id),

    // Dashboards
    dashboards: () => backendClient.get('/dashboards'),
    dashboard: (_: any, { id }: { id: string }) => backendClient.getById('/dashboards', id),
    dashboardWidgets: () => backendClient.get('/dashboard-widgets'),
    dashboardWidget: (_: any, { id }: { id: string }) => backendClient.getById('/dashboard-widgets', id),
  },

  Mutation: {
    // Users & Organizations
    createUser: (_: any, { input }: { input: any }) => backendClient.post('/users', input),
    updateUser: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/users', id, input),
    deleteUser: (_: any, { id }: { id: string }) => backendClient.delete('/users', id),
    createOrganization: (_: any, { input }: { input: any }) => backendClient.post('/organizations', input),
    updateOrganization: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/organizations', id, input),
    deleteOrganization: (_: any, { id }: { id: string }) => backendClient.delete('/organizations', id),
    createOrganizationMember: (_: any, { input }: { input: any }) => backendClient.post('/organization-members', input),
    updateOrganizationMember: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/organization-members', id, input),
    deleteOrganizationMember: (_: any, { id }: { id: string }) => backendClient.delete('/organization-members', id),
    createRole: (_: any, { input }: { input: any }) => backendClient.post('/roles', input),
    updateRole: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/roles', id, input),
    deleteRole: (_: any, { id }: { id: string }) => backendClient.delete('/roles', id),
    createKycData: (_: any, { input }: { input: any }) => backendClient.post('/kyc-data', input),
    updateKycData: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/kyc-data', id, input),
    deleteKycData: (_: any, { id }: { id: string }) => backendClient.delete('/kyc-data', id),
    createMfaSetting: (_: any, { input }: { input: any }) => backendClient.post('/mfa-settings', input),
    updateMfaSetting: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/mfa-settings', id, input),
    deleteMfaSetting: (_: any, { id }: { id: string }) => backendClient.delete('/mfa-settings', id),
    createActivityLog: (_: any, { input }: { input: any }) => backendClient.post('/activity-logs', input),

    // Teams
    createTeam: (_: any, { input }: { input: any }) => backendClient.post('/teams', input),
    updateTeam: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/teams', id, input),
    deleteTeam: (_: any, { id }: { id: string }) => backendClient.delete('/teams', id),
    createTeamMember: (_: any, { input }: { input: any }) => backendClient.post('/team-members', input),
    updateTeamMember: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/team-members', id, input),
    deleteTeamMember: (_: any, { id }: { id: string }) => backendClient.delete('/team-members', id),
    createUserSkill: (_: any, { input }: { input: any }) => backendClient.post('/user-skills', input),
    updateUserSkill: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/user-skills', id, input),
    deleteUserSkill: (_: any, { id }: { id: string }) => backendClient.delete('/user-skills', id),
    createUserAvailability: (_: any, { input }: { input: any }) => backendClient.post('/user-availability', input),
    updateUserAvailability: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/user-availability', id, input),
    deleteUserAvailability: (_: any, { id }: { id: string }) => backendClient.delete('/user-availability', id),

    // Projects
    createProject: (_: any, { input }: { input: any }) => backendClient.post('/projects', input),
    updateProject: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/projects', id, input),
    deleteProject: (_: any, { id }: { id: string }) => backendClient.delete('/projects', id),
    createProjectMember: (_: any, { input }: { input: any }) => backendClient.post('/project-members', input),
    updateProjectMember: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/project-members', id, input),
    deleteProjectMember: (_: any, { id }: { id: string }) => backendClient.delete('/project-members', id),
    createTask: (_: any, { input }: { input: any }) => backendClient.post('/tasks', input),
    updateTask: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/tasks', id, input),
    deleteTask: (_: any, { id }: { id: string }) => backendClient.delete('/tasks', id),
    createTaskChecklist: (_: any, { input }: { input: any }) => backendClient.post('/task-checklists', input),
    updateTaskChecklist: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/task-checklists', id, input),
    deleteTaskChecklist: (_: any, { id }: { id: string }) => backendClient.delete('/task-checklists', id),
    createTaskDependency: (_: any, { input }: { input: any }) => backendClient.post('/task-dependencies', input),
    updateTaskDependency: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/task-dependencies', id, input),
    deleteTaskDependency: (_: any, { id }: { id: string }) => backendClient.delete('/task-dependencies', id),
    createMilestone: (_: any, { input }: { input: any }) => backendClient.post('/milestones', input),
    updateMilestone: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/milestones', id, input),
    deleteMilestone: (_: any, { id }: { id: string }) => backendClient.delete('/milestones', id),
    createRiskRegister: (_: any, { input }: { input: any }) => backendClient.post('/risk-register', input),
    updateRiskRegister: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/risk-register', id, input),
    deleteRiskRegister: (_: any, { id }: { id: string }) => backendClient.delete('/risk-register', id),

    // Clients
    createClient: (_: any, { input }: { input: any }) => backendClient.post('/clients', input),
    updateClient: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/clients', id, input),
    deleteClient: (_: any, { id }: { id: string }) => backendClient.delete('/clients', id),
    createProjectClient: (_: any, { input }: { input: any }) => backendClient.post('/project-clients', input),
    updateProjectClient: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/project-clients', id, input),
    deleteProjectClient: (_: any, { id }: { id: string }) => backendClient.delete('/project-clients', id),
    createClientFeedback: (_: any, { input }: { input: any }) => backendClient.post('/client-feedback', input),
    updateClientFeedback: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/client-feedback', id, input),
    deleteClientFeedback: (_: any, { id }: { id: string }) => backendClient.delete('/client-feedback', id),
    createProposal: (_: any, { input }: { input: any }) => backendClient.post('/proposals', input),
    updateProposal: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/proposals', id, input),
    deleteProposal: (_: any, { id }: { id: string }) => backendClient.delete('/proposals', id),

    // Documentation
    createWikiPage: (_: any, { input }: { input: any }) => backendClient.post('/wiki-pages', input),
    updateWikiPage: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/wiki-pages', id, input),
    deleteWikiPage: (_: any, { id }: { id: string }) => backendClient.delete('/wiki-pages', id),
    createWikiPageVersion: (_: any, { input }: { input: any }) => backendClient.post('/wiki-page-versions', input),
    createDocumentFolder: (_: any, { input }: { input: any }) => backendClient.post('/document-folders', input),
    updateDocumentFolder: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/document-folders', id, input),
    deleteDocumentFolder: (_: any, { id }: { id: string }) => backendClient.delete('/document-folders', id),
    createDocument: (_: any, { input }: { input: any }) => backendClient.post('/documents', input),
    updateDocument: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/documents', id, input),
    deleteDocument: (_: any, { id }: { id: string }) => backendClient.delete('/documents', id),
    createDocumentPermission: (_: any, { input }: { input: any }) => backendClient.post('/document-permissions', input),
    updateDocumentPermission: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/document-permissions', id, input),
    deleteDocumentPermission: (_: any, { id }: { id: string }) => backendClient.delete('/document-permissions', id),
    createDocumentLink: (_: any, { input }: { input: any }) => backendClient.post('/document-links', input),
    updateDocumentLink: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/document-links', id, input),
    deleteDocumentLink: (_: any, { id }: { id: string }) => backendClient.delete('/document-links', id),

    // Communication
    createChatChannel: (_: any, { input }: { input: any }) => backendClient.post('/chat-channels', input),
    updateChatChannel: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/chat-channels', id, input),
    deleteChatChannel: (_: any, { id }: { id: string }) => backendClient.delete('/chat-channels', id),
    createChannelMember: (_: any, { input }: { input: any }) => backendClient.post('/channel-members', input),
    updateChannelMember: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/channel-members', id, input),
    deleteChannelMember: (_: any, { id }: { id: string }) => backendClient.delete('/channel-members', id),
    createChatMessage: (_: any, { input }: { input: any }) => backendClient.post('/chat-messages', input),
    updateChatMessage: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/chat-messages', id, input),
    deleteChatMessage: (_: any, { id }: { id: string }) => backendClient.delete('/chat-messages', id),
    createMessageMention: (_: any, { input }: { input: any }) => backendClient.post('/message-mentions', input),
    createMessageAttachment: (_: any, { input }: { input: any }) => backendClient.post('/message-attachments', input),
    createCommunicationLog: (_: any, { input }: { input: any }) => backendClient.post('/communication-logs', input),

    // AI & Automation
    createAiConversation: (_: any, { input }: { input: any }) => backendClient.post('/ai-conversations', input),
    updateAiConversation: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/ai-conversations', id, input),
    deleteAiConversation: (_: any, { id }: { id: string }) => backendClient.delete('/ai-conversations', id),
    createAiInsight: (_: any, { input }: { input: any }) => backendClient.post('/ai-insights', input),
    createAutomationRule: (_: any, { input }: { input: any }) => backendClient.post('/automation-rules', input),
    updateAutomationRule: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/automation-rules', id, input),
    deleteAutomationRule: (_: any, { id }: { id: string }) => backendClient.delete('/automation-rules', id),
    createAutomationLog: (_: any, { input }: { input: any }) => backendClient.post('/automation-logs', input),

    // Monitoring
    createKpiDefinition: (_: any, { input }: { input: any }) => backendClient.post('/kpi-definitions', input),
    updateKpiDefinition: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/kpi-definitions', id, input),
    deleteKpiDefinition: (_: any, { id }: { id: string }) => backendClient.delete('/kpi-definitions', id),
    createKpiMeasurement: (_: any, { input }: { input: any }) => backendClient.post('/kpi-measurements', input),
    createReportTemplate: (_: any, { input }: { input: any }) => backendClient.post('/report-templates', input),
    updateReportTemplate: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/report-templates', id, input),
    deleteReportTemplate: (_: any, { id }: { id: string }) => backendClient.delete('/report-templates', id),
    createGeneratedReport: (_: any, { input }: { input: any }) => backendClient.post('/generated-reports', input),
    createMemberPerformance: (_: any, { input }: { input: any }) => backendClient.post('/member-performance', input),

    // Notifications
    createNotificationTemplate: (_: any, { input }: { input: any }) => backendClient.post('/notification-templates', input),
    updateNotificationTemplate: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/notification-templates', id, input),
    deleteNotificationTemplate: (_: any, { id }: { id: string }) => backendClient.delete('/notification-templates', id),
    createNotificationPreference: (_: any, { input }: { input: any }) => backendClient.post('/notification-preferences', input),
    updateNotificationPreference: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/notification-preferences', id, input),
    deleteNotificationPreference: (_: any, { id }: { id: string }) => backendClient.delete('/notification-preferences', id),
    createNotification: (_: any, { input }: { input: any }) => backendClient.post('/notifications', input),
    updateNotification: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/notifications', id, input),
    deleteNotification: (_: any, { id }: { id: string }) => backendClient.delete('/notifications', id),

    // Dashboards
    createDashboard: (_: any, { input }: { input: any }) => backendClient.post('/dashboards', input),
    updateDashboard: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/dashboards', id, input),
    deleteDashboard: (_: any, { id }: { id: string }) => backendClient.delete('/dashboards', id),
    createDashboardWidget: (_: any, { input }: { input: any }) => backendClient.post('/dashboard-widgets', input),
    updateDashboardWidget: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/dashboard-widgets', id, input),
    deleteDashboardWidget: (_: any, { id }: { id: string }) => backendClient.delete('/dashboard-widgets', id),
  },
};
