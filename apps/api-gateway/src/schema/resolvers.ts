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

export const resolvers = {
  DateTime: dateTimeScalar,
  JSON: jsonScalar,

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

    // Teams
    createTeam: (_: any, { input }: { input: any }) => backendClient.post('/teams', input),
    updateTeam: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/teams', id, input),
    deleteTeam: (_: any, { id }: { id: string }) => backendClient.delete('/teams', id),
    createTeamMember: (_: any, { input }: { input: any }) => backendClient.post('/team-members', input),
    updateTeamMember: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/team-members', id, input),
    deleteTeamMember: (_: any, { id }: { id: string }) => backendClient.delete('/team-members', id),

    // Projects
    createProject: (_: any, { input }: { input: any }) => backendClient.post('/projects', input),
    updateProject: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/projects', id, input),
    deleteProject: (_: any, { id }: { id: string }) => backendClient.delete('/projects', id),
    createTask: (_: any, { input }: { input: any }) => backendClient.post('/tasks', input),
    updateTask: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/tasks', id, input),
    deleteTask: (_: any, { id }: { id: string }) => backendClient.delete('/tasks', id),
    createMilestone: (_: any, { input }: { input: any }) => backendClient.post('/milestones', input),
    updateMilestone: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/milestones', id, input),
    deleteMilestone: (_: any, { id }: { id: string }) => backendClient.delete('/milestones', id),

    // Clients
    createClient: (_: any, { input }: { input: any }) => backendClient.post('/clients', input),
    updateClient: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/clients', id, input),
    deleteClient: (_: any, { id }: { id: string }) => backendClient.delete('/clients', id),
    createProposal: (_: any, { input }: { input: any }) => backendClient.post('/proposals', input),
    updateProposal: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/proposals', id, input),
    deleteProposal: (_: any, { id }: { id: string }) => backendClient.delete('/proposals', id),

    // Communication
    createChatChannel: (_: any, { input }: { input: any }) => backendClient.post('/chat-channels', input),
    updateChatChannel: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/chat-channels', id, input),
    deleteChatChannel: (_: any, { id }: { id: string }) => backendClient.delete('/chat-channels', id),
    createChatMessage: (_: any, { input }: { input: any }) => backendClient.post('/chat-messages', input),
    updateChatMessage: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/chat-messages', id, input),
    deleteChatMessage: (_: any, { id }: { id: string }) => backendClient.delete('/chat-messages', id),

    // Documents
    createDocument: (_: any, { input }: { input: any }) => backendClient.post('/documents', input),
    updateDocument: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/documents', id, input),
    deleteDocument: (_: any, { id }: { id: string }) => backendClient.delete('/documents', id),
    createDocumentFolder: (_: any, { input }: { input: any }) => backendClient.post('/document-folders', input),
    updateDocumentFolder: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/document-folders', id, input),
    deleteDocumentFolder: (_: any, { id }: { id: string }) => backendClient.delete('/document-folders', id),

    // Notifications
    createNotification: (_: any, { input }: { input: any }) => backendClient.post('/notifications', input),
    updateNotification: (_: any, { id, input }: { id: string; input: any }) => backendClient.put('/notifications', id, input),
    deleteNotification: (_: any, { id }: { id: string }) => backendClient.delete('/notifications', id),
  },
};
