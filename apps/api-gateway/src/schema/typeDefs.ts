import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON
  scalar Decimal

  # 1. Core User & Organization Types

  type Organization {
    id: ID!
    name: String!
    slug: String!
    settings: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type OrganizationMember {
    id: ID!
    organizationId: String!
    userId: String!
    roleId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Role {
    id: ID!
    organizationId: String
    name: String!
    permissions: JSON!
    isSystem: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type KycData {
    id: ID!
    userId: String!
    status: String!
    documents: JSON
    verifiedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MfaSetting {
    id: ID!
    userId: String!
    enabled: Boolean!
    secret: String
    backupCodes: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ActivityLog {
    id: ID!
    userId: String
    action: String!
    entityType: String!
    entityId: String
    metadata: JSON
    ipAddress: String
    userAgent: String
    createdAt: DateTime!
  }

  # 2. Team & Workforce Types

  type Team {
    id: ID!
    organizationId: String!
    name: String!
    description: String
    managerId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TeamMember {
    id: ID!
    teamId: String!
    userId: String!
    role: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserSkill {
    id: ID!
    userId: String!
    skillName: String!
    proficiency: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserAvailability {
    id: ID!
    userId: String!
    date: DateTime!
    hoursAvailable: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 3. Project Management Types

  type Project {
    id: ID!
    organizationId: String!
    name: String!
    description: String
    status: String!
    startDate: DateTime
    endDate: DateTime
    budget: Decimal
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  type ProjectMember {
    id: ID!
    projectId: String!
    userId: String!
    role: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Task {
    id: ID!
    projectId: String!
    parentId: String
    assigneeId: String
    title: String!
    description: String
    status: String!
    priority: String
    dueDate: DateTime
    aiSuggestions: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TaskChecklist {
    id: ID!
    taskId: String!
    item: String!
    isCompleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TaskDependency {
    id: ID!
    taskId: String!
    dependsOnId: String!
    type: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Milestone {
    id: ID!
    projectId: String!
    title: String!
    description: String
    dueDate: DateTime
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RiskRegister {
    id: ID!
    projectId: String!
    description: String!
    probability: String
    impact: String
    mitigationPlan: String
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 4. Client Management Types

  type Client {
    id: ID!
    name: String!
    contactInfo: JSON
    portalAccess: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectClient {
    id: ID!
    projectId: String!
    clientId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ClientFeedback {
    id: ID!
    clientId: String!
    projectId: String
    rating: Int
    comment: String
    response: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Proposal {
    id: ID!
    clientId: String!
    title: String!
    content: String
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 5. Documentation & Knowledge Types

  type WikiPage {
    id: ID!
    title: String!
    content: String
    parentId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WikiPageVersion {
    id: ID!
    wikiPageId: String!
    content: String!
    version: Int!
    createdAt: DateTime!
  }

  type DocumentFolder {
    id: ID!
    organizationId: String!
    name: String!
    parentId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Document {
    id: ID!
    organizationId: String!
    folderId: String
    projectId: String
    name: String!
    url: String!
    version: Int!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DocumentPermission {
    id: ID!
    documentId: String!
    userId: String
    roleId: String
    permission: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DocumentLink {
    id: ID!
    documentId: String!
    entityType: String!
    entityId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 6. Communication Types

  type ChatChannel {
    id: ID!
    name: String
    type: String!
    teamId: String
    projectId: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ChannelMember {
    id: ID!
    channelId: String!
    userId: String!
    role: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ChatMessage {
    id: ID!
    channelId: String!
    senderId: String!
    content: String!
    aiFlags: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MessageMention {
    id: ID!
    messageId: String!
    userId: String!
    createdAt: DateTime!
  }

  type MessageAttachment {
    id: ID!
    messageId: String!
    url: String!
    fileType: String!
    createdAt: DateTime!
  }

  type CommunicationLog {
    id: ID!
    type: String!
    details: JSON!
    createdAt: DateTime!
  }

  # 7. AI & Automation Types

  type AiConversation {
    id: ID!
    userId: String
    context: JSON
    tokensUsed: Int
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AiInsight {
    id: ID!
    projectId: String
    taskId: String
    content: String!
    confidence: Float
    actionable: Boolean!
    createdAt: DateTime!
  }

  type AutomationRule {
    id: ID!
    name: String!
    trigger: JSON!
    actions: JSON!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AutomationLog {
    id: ID!
    ruleId: String!
    status: String!
    details: JSON
    createdAt: DateTime!
  }

  # 8. Monitoring & Reporting Types

  type KpiDefinition {
    id: ID!
    name: String!
    formula: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type KpiMeasurement {
    id: ID!
    kpiId: String!
    value: Float!
    measuredAt: DateTime!
    createdAt: DateTime!
  }

  type ReportTemplate {
    id: ID!
    name: String!
    config: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type GeneratedReport {
    id: ID!
    templateId: String
    url: String!
    format: String!
    createdAt: DateTime!
  }

  type MemberPerformance {
    id: ID!
    userId: String!
    metric: String!
    value: Float!
    period: String!
    createdAt: DateTime!
  }

  # 9. Notification Types

  type NotificationTemplate {
    id: ID!
    name: String!
    content: String!
    channels: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NotificationPreference {
    id: ID!
    userId: String!
    preferences: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Notification {
    id: ID!
    userId: String!
    content: String!
    isRead: Boolean!
    type: String
    createdAt: DateTime!
  }

  # 10. Analytics & Dashboard Types

  type Dashboard {
    id: ID!
    userId: String!
    name: String!
    layout: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DashboardWidget {
    id: ID!
    dashboardId: String!
    type: String!
    config: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Query Type
  type Query {
    # Users & Organizations
    users: [User!]!
    user(id: ID!): User
    organizations: [Organization!]!
    organization(id: ID!): Organization
    organizationMembers: [OrganizationMember!]!
    organizationMember(id: ID!): OrganizationMember
    roles: [Role!]!
    role(id: ID!): Role
    kycData: [KycData!]!
    kycDataById(id: ID!): KycData
    mfaSettings: [MfaSetting!]!
    mfaSetting(id: ID!): MfaSetting
    activityLogs: [ActivityLog!]!
    activityLog(id: ID!): ActivityLog

    # Teams
    teams: [Team!]!
    team(id: ID!): Team
    teamMembers: [TeamMember!]!
    teamMember(id: ID!): TeamMember
    userSkills: [UserSkill!]!
    userSkill(id: ID!): UserSkill
    userAvailability: [UserAvailability!]!
    userAvailabilityById(id: ID!): UserAvailability

    # Projects
    projects: [Project!]!
    project(id: ID!): Project
    projectMembers: [ProjectMember!]!
    projectMember(id: ID!): ProjectMember
    tasks: [Task!]!
    task(id: ID!): Task
    taskChecklists: [TaskChecklist!]!
    taskChecklist(id: ID!): TaskChecklist
    taskDependencies: [TaskDependency!]!
    taskDependency(id: ID!): TaskDependency
    milestones: [Milestone!]!
    milestone(id: ID!): Milestone
    riskRegisters: [RiskRegister!]!
    riskRegister(id: ID!): RiskRegister

    # Clients
    clients: [Client!]!
    client(id: ID!): Client
    projectClients: [ProjectClient!]!
    projectClient(id: ID!): ProjectClient
    clientFeedbacks: [ClientFeedback!]!
    clientFeedback(id: ID!): ClientFeedback
    proposals: [Proposal!]!
    proposal(id: ID!): Proposal

    # Documentation
    wikiPages: [WikiPage!]!
    wikiPage(id: ID!): WikiPage
    wikiPageVersions: [WikiPageVersion!]!
    wikiPageVersion(id: ID!): WikiPageVersion
    documentFolders: [DocumentFolder!]!
    documentFolder(id: ID!): DocumentFolder
    documents: [Document!]!
    document(id: ID!): Document
    documentPermissions: [DocumentPermission!]!
    documentPermission(id: ID!): DocumentPermission
    documentLinks: [DocumentLink!]!
    documentLink(id: ID!): DocumentLink

    # Communication
    chatChannels: [ChatChannel!]!
    chatChannel(id: ID!): ChatChannel
    channelMembers: [ChannelMember!]!
    channelMember(id: ID!): ChannelMember
    chatMessages: [ChatMessage!]!
    chatMessage(id: ID!): ChatMessage
    messageMentions: [MessageMention!]!
    messageMention(id: ID!): MessageMention
    messageAttachments: [MessageAttachment!]!
    messageAttachment(id: ID!): MessageAttachment
    communicationLogs: [CommunicationLog!]!
    communicationLog(id: ID!): CommunicationLog

    # AI & Automation
    aiConversations: [AiConversation!]!
    aiConversation(id: ID!): AiConversation
    aiInsights: [AiInsight!]!
    aiInsight(id: ID!): AiInsight
    automationRules: [AutomationRule!]!
    automationRule(id: ID!): AutomationRule
    automationLogs: [AutomationLog!]!
    automationLog(id: ID!): AutomationLog

    # Monitoring
    kpiDefinitions: [KpiDefinition!]!
    kpiDefinition(id: ID!): KpiDefinition
    kpiMeasurements: [KpiMeasurement!]!
    kpiMeasurement(id: ID!): KpiMeasurement
    reportTemplates: [ReportTemplate!]!
    reportTemplate(id: ID!): ReportTemplate
    generatedReports: [GeneratedReport!]!
    generatedReport(id: ID!): GeneratedReport
    memberPerformances: [MemberPerformance!]!
    memberPerformance(id: ID!): MemberPerformance

    # Notifications
    notificationTemplates: [NotificationTemplate!]!
    notificationTemplate(id: ID!): NotificationTemplate
    notificationPreferences: [NotificationPreference!]!
    notificationPreference(id: ID!): NotificationPreference
    notifications: [Notification!]!
    notification(id: ID!): Notification

    # Dashboards
    dashboards: [Dashboard!]!
    dashboard(id: ID!): Dashboard
    dashboardWidgets: [DashboardWidget!]!
    dashboardWidget(id: ID!): DashboardWidget
  }

  # Mutation Type
  type Mutation {
    # Users & Organizations
    createUser(input: JSON!): User!
    updateUser(id: ID!, input: JSON!): User!
    deleteUser(id: ID!): DeleteResponse!
    createOrganization(input: JSON!): Organization!
    updateOrganization(id: ID!, input: JSON!): Organization!
    deleteOrganization(id: ID!): DeleteResponse!
    createOrganizationMember(input: JSON!): OrganizationMember!
    updateOrganizationMember(id: ID!, input: JSON!): OrganizationMember!
    deleteOrganizationMember(id: ID!): DeleteResponse!
    createRole(input: JSON!): Role!
    updateRole(id: ID!, input: JSON!): Role!
    deleteRole(id: ID!): DeleteResponse!
    createKycData(input: JSON!): KycData!
    updateKycData(id: ID!, input: JSON!): KycData!
    deleteKycData(id: ID!): DeleteResponse!
    createMfaSetting(input: JSON!): MfaSetting!
    updateMfaSetting(id: ID!, input: JSON!): MfaSetting!
    deleteMfaSetting(id: ID!): DeleteResponse!
    createActivityLog(input: JSON!): ActivityLog!

    # Teams
    createTeam(input: JSON!): Team!
    updateTeam(id: ID!, input: JSON!): Team!
    deleteTeam(id: ID!): DeleteResponse!
    createTeamMember(input: JSON!): TeamMember!
    updateTeamMember(id: ID!, input: JSON!): TeamMember!
    deleteTeamMember(id: ID!): DeleteResponse!
    createUserSkill(input: JSON!): UserSkill!
    updateUserSkill(id: ID!, input: JSON!): UserSkill!
    deleteUserSkill(id: ID!): DeleteResponse!
    createUserAvailability(input: JSON!): UserAvailability!
    updateUserAvailability(id: ID!, input: JSON!): UserAvailability!
    deleteUserAvailability(id: ID!): DeleteResponse!

    # Projects
    createProject(input: JSON!): Project!
    updateProject(id: ID!, input: JSON!): Project!
    deleteProject(id: ID!): DeleteResponse!
    createProjectMember(input: JSON!): ProjectMember!
    updateProjectMember(id: ID!, input: JSON!): ProjectMember!
    deleteProjectMember(id: ID!): DeleteResponse!
    createTask(input: JSON!): Task!
    updateTask(id: ID!, input: JSON!): Task!
    deleteTask(id: ID!): DeleteResponse!
    createTaskChecklist(input: JSON!): TaskChecklist!
    updateTaskChecklist(id: ID!, input: JSON!): TaskChecklist!
    deleteTaskChecklist(id: ID!): DeleteResponse!
    createTaskDependency(input: JSON!): TaskDependency!
    updateTaskDependency(id: ID!, input: JSON!): TaskDependency!
    deleteTaskDependency(id: ID!): DeleteResponse!
    createMilestone(input: JSON!): Milestone!
    updateMilestone(id: ID!, input: JSON!): Milestone!
    deleteMilestone(id: ID!): DeleteResponse!
    createRiskRegister(input: JSON!): RiskRegister!
    updateRiskRegister(id: ID!, input: JSON!): RiskRegister!
    deleteRiskRegister(id: ID!): DeleteResponse!

    # Clients
    createClient(input: JSON!): Client!
    updateClient(id: ID!, input: JSON!): Client!
    deleteClient(id: ID!): DeleteResponse!
    createProjectClient(input: JSON!): ProjectClient!
    updateProjectClient(id: ID!, input: JSON!): ProjectClient!
    deleteProjectClient(id: ID!): DeleteResponse!
    createClientFeedback(input: JSON!): ClientFeedback!
    updateClientFeedback(id: ID!, input: JSON!): ClientFeedback!
    deleteClientFeedback(id: ID!): DeleteResponse!
    createProposal(input: JSON!): Proposal!
    updateProposal(id: ID!, input: JSON!): Proposal!
    deleteProposal(id: ID!): DeleteResponse!

    # Documentation
    createWikiPage(input: JSON!): WikiPage!
    updateWikiPage(id: ID!, input: JSON!): WikiPage!
    deleteWikiPage(id: ID!): DeleteResponse!
    createWikiPageVersion(input: JSON!): WikiPageVersion!
    createDocumentFolder(input: JSON!): DocumentFolder!
    updateDocumentFolder(id: ID!, input: JSON!): DocumentFolder!
    deleteDocumentFolder(id: ID!): DeleteResponse!
    createDocument(input: JSON!): Document!
    updateDocument(id: ID!, input: JSON!): Document!
    deleteDocument(id: ID!): DeleteResponse!
    createDocumentPermission(input: JSON!): DocumentPermission!
    updateDocumentPermission(id: ID!, input: JSON!): DocumentPermission!
    deleteDocumentPermission(id: ID!): DeleteResponse!
    createDocumentLink(input: JSON!): DocumentLink!
    updateDocumentLink(id: ID!, input: JSON!): DocumentLink!
    deleteDocumentLink(id: ID!): DeleteResponse!

    # Communication
    createChatChannel(input: JSON!): ChatChannel!
    updateChatChannel(id: ID!, input: JSON!): ChatChannel!
    deleteChatChannel(id: ID!): DeleteResponse!
    createChannelMember(input: JSON!): ChannelMember!
    updateChannelMember(id: ID!, input: JSON!): ChannelMember!
    deleteChannelMember(id: ID!): DeleteResponse!
    createChatMessage(input: JSON!): ChatMessage!
    updateChatMessage(id: ID!, input: JSON!): ChatMessage!
    deleteChatMessage(id: ID!): DeleteResponse!
    createMessageMention(input: JSON!): MessageMention!
    createMessageAttachment(input: JSON!): MessageAttachment!
    createCommunicationLog(input: JSON!): CommunicationLog!

    # AI & Automation
    createAiConversation(input: JSON!): AiConversation!
    updateAiConversation(id: ID!, input: JSON!): AiConversation!
    deleteAiConversation(id: ID!): DeleteResponse!
    createAiInsight(input: JSON!): AiInsight!
    createAutomationRule(input: JSON!): AutomationRule!
    updateAutomationRule(id: ID!, input: JSON!): AutomationRule!
    deleteAutomationRule(id: ID!): DeleteResponse!
    createAutomationLog(input: JSON!): AutomationLog!

    # Monitoring
    createKpiDefinition(input: JSON!): KpiDefinition!
    updateKpiDefinition(id: ID!, input: JSON!): KpiDefinition!
    deleteKpiDefinition(id: ID!): DeleteResponse!
    createKpiMeasurement(input: JSON!): KpiMeasurement!
    createReportTemplate(input: JSON!): ReportTemplate!
    updateReportTemplate(id: ID!, input: JSON!): ReportTemplate!
    deleteReportTemplate(id: ID!): DeleteResponse!
    createGeneratedReport(input: JSON!): GeneratedReport!
    createMemberPerformance(input: JSON!): MemberPerformance!

    # Notifications
    createNotificationTemplate(input: JSON!): NotificationTemplate!
    updateNotificationTemplate(id: ID!, input: JSON!): NotificationTemplate!
    deleteNotificationTemplate(id: ID!): DeleteResponse!
    createNotificationPreference(input: JSON!): NotificationPreference!
    updateNotificationPreference(id: ID!, input: JSON!): NotificationPreference!
    deleteNotificationPreference(id: ID!): DeleteResponse!
    createNotification(input: JSON!): Notification!
    updateNotification(id: ID!, input: JSON!): Notification!
    deleteNotification(id: ID!): DeleteResponse!

    # Dashboards
    createDashboard(input: JSON!): Dashboard!
    updateDashboard(id: ID!, input: JSON!): Dashboard!
    deleteDashboard(id: ID!): DeleteResponse!
    createDashboardWidget(input: JSON!): DashboardWidget!
    updateDashboardWidget(id: ID!, input: JSON!): DashboardWidget!
    deleteDashboardWidget(id: ID!): DeleteResponse!
  }

  type DeleteResponse {
    message: String!
  }
`;
