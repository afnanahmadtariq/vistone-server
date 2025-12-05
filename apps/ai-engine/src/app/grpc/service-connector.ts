/**
 * Service Connector - Unified interface for service communication
 * Supports both HTTP and gRPC protocols with automatic fallback
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  projectServiceClient,
  clientServiceClient,
  workforceServiceClient,
  communicationServiceClient,
  notificationServiceClient,
  knowledgeServiceClient,
} from './http-client';

/**
 * Generic service response type
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Project Management Service Connector
 */
export class ProjectManagementConnector {
  /**
   * Create a new project
   */
  async createProject(data: {
    organizationId: string;
    name: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    managerId?: string;
    clientId?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.post('/projects', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.getById('/projects', id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update a project
   */
  async updateProject(id: string, data: Partial<{
    name: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string;
    budget: number;
    spentBudget: number;
    progress: number;
    managerId: string;
    clientId: string;
  }>): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.put('/projects', id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.delete('/projects', id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List projects
   */
  async listProjects(params?: {
    organizationId?: string;
    status?: string;
    search?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.organizationId) queryParams.set('organizationId', params.organizationId);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.search) queryParams.set('search', params.search);
      
      const endpoint = `/projects${queryParams.toString() ? `?${queryParams}` : ''}`;
      const result = await projectServiceClient.get<any[]>(endpoint);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create a new task
   */
  async createTask(data: {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
    estimatedHours?: number;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.post('/tasks', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.getById('/tasks', id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update a task
   */
  async updateTask(id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    assigneeId: string;
    estimatedHours: number;
    actualHours: number;
  }>): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.put('/tasks', id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.delete('/tasks', id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List tasks
   */
  async listTasks(params?: {
    projectId?: string;
    assigneeId?: string;
    status?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.projectId) queryParams.set('projectId', params.projectId);
      if (params?.assigneeId) queryParams.set('assigneeId', params.assigneeId);
      if (params?.status) queryParams.set('status', params.status);
      
      const endpoint = `/tasks${queryParams.toString() ? `?${queryParams}` : ''}`;
      const result = await projectServiceClient.get<any[]>(endpoint);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List milestones
   */
  async listMilestones(projectId: string): Promise<ServiceResponse<any[]>> {
    try {
      const result = await projectServiceClient.get<any[]>(`/milestones?projectId=${projectId}`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create a milestone
   */
  async createMilestone(data: {
    projectId: string;
    name: string;
    description?: string;
    dueDate?: string;
    status?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await projectServiceClient.post('/milestones', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * Client Management Service Connector
 */
export class ClientManagementConnector {
  /**
   * Create a new client
   */
  async createClient(data: {
    organizationId: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    industry?: string;
    status?: string;
    notes?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await clientServiceClient.post('/clients', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get a client by ID
   */
  async getClient(id: string): Promise<ServiceResponse<any>> {
    try {
      const result = await clientServiceClient.getById('/clients', id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update a client
   */
  async updateClient(id: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    company: string;
    industry: string;
    status: string;
    notes: string;
  }>): Promise<ServiceResponse<any>> {
    try {
      const result = await clientServiceClient.put('/clients', id, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List clients
   */
  async listClients(params?: {
    organizationId?: string;
    status?: string;
    search?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.organizationId) queryParams.set('organizationId', params.organizationId);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.search) queryParams.set('search', params.search);
      
      const endpoint = `/clients${queryParams.toString() ? `?${queryParams}` : ''}`;
      const result = await clientServiceClient.get<any[]>(endpoint);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create a proposal
   */
  async createProposal(data: {
    clientId: string;
    organizationId: string;
    title: string;
    description?: string;
    amount?: number;
    status?: string;
    validUntil?: string;
    createdById?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await clientServiceClient.post('/proposals', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List proposals
   */
  async listProposals(params?: {
    organizationId?: string;
    clientId?: string;
    status?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.organizationId) queryParams.set('organizationId', params.organizationId);
      if (params?.clientId) queryParams.set('clientId', params.clientId);
      if (params?.status) queryParams.set('status', params.status);
      
      const endpoint = `/proposals${queryParams.toString() ? `?${queryParams}` : ''}`;
      const result = await clientServiceClient.get<any[]>(endpoint);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * Workforce Management Service Connector
 */
export class WorkforceManagementConnector {
  /**
   * Create a team
   */
  async createTeam(data: {
    organizationId: string;
    name: string;
    description?: string;
    leaderId?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await workforceServiceClient.post('/teams', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get a team by ID
   */
  async getTeam(id: string): Promise<ServiceResponse<any>> {
    try {
      const result = await workforceServiceClient.getById('/teams', id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List teams
   */
  async listTeams(params?: {
    organizationId?: string;
    search?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.organizationId) queryParams.set('organizationId', params.organizationId);
      if (params?.search) queryParams.set('search', params.search);
      
      const endpoint = `/teams${queryParams.toString() ? `?${queryParams}` : ''}`;
      const result = await workforceServiceClient.get<any[]>(endpoint);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Add a team member
   */
  async addTeamMember(data: {
    teamId: string;
    userId: string;
    role?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await workforceServiceClient.post(`/team-members`, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<ServiceResponse<any[]>> {
    try {
      const result = await workforceServiceClient.get<any[]>(`/team-members?teamId=${teamId}`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get user skills
   */
  async getUserSkills(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      const result = await workforceServiceClient.get<any[]>(`/user-skills?userId=${userId}`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Add user skill
   */
  async addUserSkill(data: {
    userId: string;
    skillName: string;
    proficiencyLevel?: string;
    yearsOfExperience?: number;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await workforceServiceClient.post('/user-skills', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * Communication Service Connector
 */
export class CommunicationConnector {
  /**
   * Send a message
   */
  async sendMessage(data: {
    channelId: string;
    senderId: string;
    content: string;
    messageType?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await communicationServiceClient.post('/messages', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List messages in a channel
   */
  async listMessages(channelId: string, limit = 50): Promise<ServiceResponse<any[]>> {
    try {
      const result = await communicationServiceClient.get<any[]>(
        `/messages?channelId=${channelId}&limit=${limit}`
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create a channel
   */
  async createChannel(data: {
    organizationId: string;
    name: string;
    description?: string;
    channelType?: string;
    isPrivate?: boolean;
    memberIds?: string[];
    createdById: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await communicationServiceClient.post('/channels', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List channels
   */
  async listChannels(params?: {
    organizationId?: string;
    userId?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.organizationId) queryParams.set('organizationId', params.organizationId);
      if (params?.userId) queryParams.set('userId', params.userId);
      
      const endpoint = `/channels${queryParams.toString() ? `?${queryParams}` : ''}`;
      const result = await communicationServiceClient.get<any[]>(endpoint);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create an announcement
   */
  async createAnnouncement(data: {
    organizationId: string;
    title: string;
    content: string;
    priority?: string;
    createdById: string;
    expiresAt?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await communicationServiceClient.post('/announcements', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * Notification Service Connector
 */
export class NotificationConnector {
  /**
   * Send a notification
   */
  async sendNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await notificationServiceClient.post('/notifications', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * List notifications for a user
   */
  async listNotifications(userId: string, unreadOnly = false): Promise<ServiceResponse<any[]>> {
    try {
      const result = await notificationServiceClient.get<any[]>(
        `/notifications?userId=${userId}${unreadOnly ? '&unreadOnly=true' : ''}`
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ServiceResponse<any>> {
    try {
      const result = await notificationServiceClient.patch('/notifications', notificationId, { isRead: true });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(data: {
    userIds: string[];
    type: string;
    title: string;
    message: string;
    priority?: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await notificationServiceClient.post('/notifications/bulk', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/**
 * Knowledge Hub Service Connector
 */
export class KnowledgeHubConnector {
  /**
   * Create a document
   */
  async createDocument(data: {
    organizationId: string;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    createdById: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await knowledgeServiceClient.post('/documents', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(params: {
    organizationId: string;
    query: string;
    category?: string;
  }): Promise<ServiceResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('organizationId', params.organizationId);
      queryParams.set('search', params.query);
      if (params.category) queryParams.set('category', params.category);
      
      const result = await knowledgeServiceClient.get<any[]>(`/documents?${queryParams}`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Create a wiki page
   */
  async createWikiPage(data: {
    organizationId: string;
    title: string;
    content: string;
    parentId?: string;
    createdById: string;
  }): Promise<ServiceResponse<any>> {
    try {
      const result = await knowledgeServiceClient.post('/wiki', data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

// Export singleton instances
export const projectConnector = new ProjectManagementConnector();
export const clientConnector = new ClientManagementConnector();
export const workforceConnector = new WorkforceManagementConnector();
export const communicationConnector = new CommunicationConnector();
export const notificationConnector = new NotificationConnector();
export const knowledgeConnector = new KnowledgeHubConnector();
