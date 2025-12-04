import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON
  scalar Decimal

  # Authentication Types

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: AuthUser!
    isNewUser: Boolean
  }

  type TokenPayload {
    accessToken: String!
    refreshToken: String!
  }

  type AuthUser {
    id: ID!
    name: String
    firstName: String
    lastName: String
    email: String!
    role: String
    avatar: String
    status: String
    skills: [String]
    teamId: ID
    joinedAt: DateTime
    organizationId: ID
    organization: AuthOrganization
    permissions: JSON
  }

  type AuthOrganization {
    id: ID!
    name: String!
    slug: String!
  }

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
    role: String
    avatar: String
    status: String
    skills: [String]
    teamId: ID
    joinedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime

    # Relations
    team: Team
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
    memberCount: Int
    assignedProjects: Int
    tags: [String]
    manager: TeamManager
    members: [TeamMemberInfo]
    ongoingProjects: [TeamProject]
    completedProjects: [CompletedProject]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type TeamManager {
    id: ID!
    name: String
    avatar: String
  }

  type TeamMemberInfo {
    id: ID!
    name: String
    role: String
    email: String
    status: String
    avatar: String
  }

  type TeamProject {
    id: ID!
    name: String!
    deadline: DateTime
    status: String!
  }

  type CompletedProject {
    id: ID!
    name: String!
    completedDate: DateTime
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
    spentBudget: Decimal
    progress: Int!
    clientId: ID
    managerId: ID
    memberIds: [ID!]
    teamIds: [String!]
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime

    # Relations
    tasks: [Task]
    milestones: [Milestone]
    client: Client
    manager: User
    members: [User!]
    teams: [Team!]
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
    priority: String!
    dueDate: DateTime
    startDate: DateTime
    estimatedHours: Float
    actualHours: Float
    creatorId: String
    aiSuggestions: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    assignees: [User!]
    creator: User
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
    name: String
    description: String
    dueDate: DateTime!
    status: String!
    completed: Boolean!
    completedAt: DateTime
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
    organizationId: String
    name: String!
    email: String
    company: String
    phone: String
    address: String
    industry: String
    status: String
    contactInfo: JSON
    portalAccess: Boolean!
    contactPersonId: String
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    rating: ClientRating
    projects: [Project!]
    contracts: [Contract!]
    contactPerson: User
  }

  type ClientRating {
    budget: Float
    communication: Float
    schedule: Float
    overall: Float
  }

  type Contract {
    id: ID!
    title: String!
    status: String!
    startDate: DateTime
    endDate: DateTime
    amount: Float
    clientId: ID!
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

  # 11. AI Engine Types

  type AiChatResponse {
    success: Boolean!
    data: AiChatData
    error: String
  }

  type AiChatData {
    answer: String!
    sessionId: String!
    isOutOfScope: Boolean!
    sources: [AiSource!]!
  }

  type AiSource {
    contentType: String!
    title: String!
    sourceId: String!
  }

  type AiIndexingStats {
    success: Boolean!
    data: AiStatsData
    error: String
  }

  type AiStatsData {
    totalDocuments: Int!
    byContentType: JSON
  }

  type AiSyncResponse {
    success: Boolean!
    data: AiSyncData
    error: String
  }

  type AiSyncData {
    totalSynced: Int!
    totalErrors: Int!
    details: JSON
  }

  type AiIndexResponse {
    success: Boolean!
    data: JSON
    error: String
  }

  # Query Type
  type Query {
    # Authentication
    me: AuthUser

    # Users & Organizations
    users(organizationId: ID): [User!]!
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
    teams(organizationId: ID): [Team!]!
    team(id: ID!): Team
    teamMembers: [TeamMember!]!
    teamMember(id: ID!): TeamMember
    userSkills: [UserSkill!]!
    userSkill(id: ID!): UserSkill
    userAvailability: [UserAvailability!]!
    userAvailabilityById(id: ID!): UserAvailability

    # Projects
    projects(status: String, search: String, organizationId: ID): [Project!]!
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
    clients(search: String, status: String, industry: String, organizationId: ID): [Client!]!
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

    # AI Engine
    aiChatStats(organizationId: String!): AiIndexingStats!
  }

  # Mutation Type
  type Mutation {
    # Authentication
    login(email: String!, password: String!): AuthPayload!
    register(name: String!, email: String!, password: String!, organizationName: String): AuthPayload!
    googleLogin(idToken: String!): AuthPayload!
    googleSignup(idToken: String!): AuthPayload!
    refreshToken(refreshToken: String!): TokenPayload!
    logout: Boolean!

    # Teams - Enhanced
    removeMember(teamId: ID!, memberId: ID!): RemoveMemberResponse!

    # Users & Organizations
    createUser(input: JSON!): User!
    updateUser(id: ID!, input: JSON!): User!
    deleteUser(id: ID!): DeleteResponse!
    inviteMember(input: InviteMemberInput!): User!
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
    addTeamMember(teamId: ID!, userId: ID!): Team!
    removeTeamMember(teamId: ID!, userId: ID!): Team!
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
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
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

    # AI Engine
    aiChat(input: AiChatInput!): AiChatResponse!
    aiClearHistory(sessionId: String!): DeleteResponse!
    aiSyncAll(organizationId: String!): AiSyncResponse!
    aiSyncType(organizationId: String!, type: String!): AiSyncResponse!
    aiIndexDocument(input: AiIndexDocumentInput!): AiIndexResponse!
    aiRemoveDocument(sourceSchema: String!, sourceTable: String!, sourceId: String!): AiIndexResponse!
  }

  type DeleteResponse {
    message: String!
  }

  type RemoveMemberResponse {
    success: Boolean!
  }

  # Input Types

  input InviteMemberInput {
    email: String!
    firstName: String
    lastName: String
    role: String
    teamId: ID
    organizationId: ID!
  }

  input CreateTeamInput {
    name: String!
    description: String
    managerId: ID
    memberIds: [ID!]
    organizationId: ID!
  }

  input UpdateTeamInput {
    name: String
    description: String
    managerId: ID
  }

  input CreateClientInput {
    name: String!
    email: String
    company: String
    phone: String
    address: String
    industry: String
    portalAccess: Boolean
    contactPersonId: ID
    organizationId: ID!
  }

  input UpdateClientInput {
    name: String
    email: String
    company: String
    phone: String
    address: String
    industry: String
    status: String
    portalAccess: Boolean
    contactPersonId: ID
  }

  input CreateTaskInput {
    title: String!
    description: String
    status: String
    priority: String
    projectId: ID!
    assigneeId: ID
    dueDate: DateTime
    startDate: DateTime
    estimatedHours: Float
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: String
    priority: String
    assigneeId: ID
    dueDate: DateTime
    startDate: DateTime
    estimatedHours: Float
    actualHours: Float
  }

  input CreateMilestoneInput {
    title: String!
    description: String
    projectId: ID!
    dueDate: DateTime!
  }

  input UpdateMilestoneInput {
    title: String
    description: String
    dueDate: DateTime
    completed: Boolean
  }

  input CreateProjectInput {
    name: String!
    description: String
    type: String
    status: String!
    visibility: String
    notifyTeam: Boolean
    notifyClient: Boolean
    contributors: [String!]
    clientId: String
    startDate: String
    endDate: String
    teamId: String
    managerId: String
    organizationId: String!
  }

  input UpdateProjectInput {
    name: String
    description: String
    type: String
    status: String
    visibility: String
    notifyTeam: Boolean
    notifyClient: Boolean
    contributors: [String!]
    clientId: String
    startDate: String
    endDate: String
    teamId: String
    managerId: String
    progress: Int
    budget: Decimal
    spentBudget: Decimal
  }

  input AiChatInput {
    organizationId: String!
    organizationName: String
    userId: String!
    sessionId: String
    query: String!
    contentTypes: [String!]
  }

  input AiIndexDocumentInput {
    organizationId: String!
    sourceSchema: String!
    sourceTable: String!
    sourceId: String!
    title: String!
    content: String!
    contentType: String!
    metadata: JSON
  }
`;
