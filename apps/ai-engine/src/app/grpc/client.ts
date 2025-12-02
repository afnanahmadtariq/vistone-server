import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { config } from '../config/env';

// Define the proto path - resolve from dist root
const getProtoPath = () => {
  // In production: __dirname is dist/apps/ai-engine/src/app/grpc
  // Proto files are copied to: dist/app/grpc/protos/
  const distRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
  return path.join(distRoot, 'app', 'grpc', 'protos', 'vistone.proto');
};

// Lazy load proto to avoid errors on import
let vistone: any = null;

function loadProto() {
  if (!vistone) {
    const PROTO_PATH = getProtoPath();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    vistone = protoDescriptor.vistone;
  }
  return vistone;
}

// Service client types
export interface GrpcClients {
  auth: any;
  workforce: any;
  project: any;
  client: any;
  knowledge: any;
  communication: any;
  notification: any;
  monitoring: any;
}

// Create gRPC clients
function createClient(ServiceClass: any, port: string): any {
  return new ServiceClass(
    `localhost:${port}`,
    grpc.credentials.createInsecure()
  );
}

// Initialize all gRPC clients
export function initGrpcClients(): GrpcClients {
  const proto = loadProto();
  return {
    auth: createClient(proto.AuthService, config.grpc.authService),
    workforce: createClient(proto.WorkforceService, config.grpc.workforceService),
    project: createClient(proto.ProjectService, config.grpc.projectService),
    client: createClient(proto.ClientService, config.grpc.clientService),
    knowledge: createClient(proto.KnowledgeService, config.grpc.knowledgeService),
    communication: createClient(proto.CommunicationService, config.grpc.communicationService),
    notification: createClient(proto.NotificationService, config.grpc.notificationService),
    monitoring: createClient(proto.MonitoringService, config.grpc.monitoringService),
  };
}

// Promisify gRPC calls
export function promisifyGrpcCall<T>(
  client: any,
  method: string,
  request: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    client[method](request, (error: grpc.ServiceError | null, response: T) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

// Service action executor for AI to use
export class ServiceActionExecutor {
  private clients: GrpcClients;

  constructor(clients: GrpcClients) {
    this.clients = clients;
  }

  // Auth Service Actions
  async getUser(userId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.auth, 'GetUser', { userId });
  }

  async getUsers(organizationId: string, limit = 100, offset = 0): Promise<any> {
    return promisifyGrpcCall(this.clients.auth, 'GetUsers', { organizationId, limit, offset });
  }

  async createUser(data: { email: string; firstName: string; lastName: string; organizationId: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.auth, 'CreateUser', data);
  }

  async updateUser(data: { userId: string; firstName?: string; lastName?: string; email?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.auth, 'UpdateUser', data);
  }

  // Workforce Service Actions
  async getTeams(organizationId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.workforce, 'GetTeams', { organizationId });
  }

  async getTeam(teamId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.workforce, 'GetTeam', { teamId });
  }

  async createTeam(data: { organizationId: string; name: string; description?: string; managerId?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.workforce, 'CreateTeam', data);
  }

  async updateTeam(data: { teamId: string; name?: string; description?: string; managerId?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.workforce, 'UpdateTeam', data);
  }

  async addTeamMember(data: { teamId: string; userId: string; role?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.workforce, 'AddTeamMember', data);
  }

  // Project Service Actions
  async getProjects(organizationId: string, limit = 100, offset = 0): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'GetProjects', { organizationId, limit, offset });
  }

  async getProject(projectId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'GetProject', { projectId });
  }

  async createProject(data: {
    organizationId: string;
    name: string;
    description?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    budget?: string;
  }): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'CreateProject', data);
  }

  async updateProject(data: {
    projectId: string;
    name?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    budget?: string;
  }): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'UpdateProject', data);
  }

  async getTasks(projectId: string, limit = 100, offset = 0): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'GetTasks', { projectId, limit, offset });
  }

  async getTask(taskId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'GetTask', { taskId });
  }

  async createTask(data: {
    projectId: string;
    parentId?: string;
    assigneeId?: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    dueDate?: string;
  }): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'CreateTask', data);
  }

  async updateTask(data: {
    taskId: string;
    assigneeId?: string;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
  }): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'UpdateTask', data);
  }

  async getMilestones(projectId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'GetMilestones', { projectId });
  }

  async createMilestone(data: {
    projectId: string;
    title: string;
    description?: string;
    dueDate?: string;
    status: string;
  }): Promise<any> {
    return promisifyGrpcCall(this.clients.project, 'CreateMilestone', data);
  }

  // Client Service Actions
  async getClients(limit = 100, offset = 0): Promise<any> {
    return promisifyGrpcCall(this.clients.client, 'GetClients', { limit, offset });
  }

  async getClient(clientId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.client, 'GetClient', { clientId });
  }

  async createClient(data: { name: string; contactInfo?: string; portalAccess?: boolean }): Promise<any> {
    return promisifyGrpcCall(this.clients.client, 'CreateClient', data);
  }

  async updateClient(data: { clientId: string; name?: string; contactInfo?: string; portalAccess?: boolean }): Promise<any> {
    return promisifyGrpcCall(this.clients.client, 'UpdateClient', data);
  }

  async createProposal(data: { clientId: string; title: string; content?: string; status: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.client, 'CreateProposal', data);
  }

  // Knowledge Service Actions
  async getWikiPages(limit = 100, offset = 0): Promise<any> {
    return promisifyGrpcCall(this.clients.knowledge, 'GetWikiPages', { limit, offset });
  }

  async getWikiPage(pageId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.knowledge, 'GetWikiPage', { pageId });
  }

  async createWikiPage(data: { title: string; content?: string; parentId?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.knowledge, 'CreateWikiPage', data);
  }

  async updateWikiPage(data: { pageId: string; title?: string; content?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.knowledge, 'UpdateWikiPage', data);
  }

  // Communication Service Actions
  async getChannels(teamId?: string, projectId?: string): Promise<any> {
    return promisifyGrpcCall(this.clients.communication, 'GetChannels', { teamId, projectId });
  }

  async getMessages(channelId: string, limit = 100, offset = 0): Promise<any> {
    return promisifyGrpcCall(this.clients.communication, 'GetMessages', { channelId, limit, offset });
  }

  async sendMessage(data: { channelId: string; senderId: string; content: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.communication, 'SendMessage', data);
  }

  async createChannel(data: { name: string; type: string; teamId?: string; projectId?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.communication, 'CreateChannel', data);
  }

  // Notification Service Actions
  async getNotifications(userId: string, unreadOnly = false): Promise<any> {
    return promisifyGrpcCall(this.clients.notification, 'GetNotifications', { userId, unreadOnly });
  }

  async sendNotification(data: { userId: string; content: string; type?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.notification, 'SendNotification', data);
  }

  async markNotificationAsRead(notificationId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.notification, 'MarkAsRead', { notificationId });
  }

  // Monitoring Service Actions
  async getKPIs(organizationId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.monitoring, 'GetKPIs', { organizationId });
  }

  async getDashboards(userId: string): Promise<any> {
    return promisifyGrpcCall(this.clients.monitoring, 'GetDashboards', { userId });
  }

  async createDashboard(data: { userId: string; name: string; layout?: string }): Promise<any> {
    return promisifyGrpcCall(this.clients.monitoring, 'CreateDashboard', data);
  }

  async logConversation(data: { userId: string; context: string; tokensUsed: number }): Promise<any> {
    return promisifyGrpcCall(this.clients.monitoring, 'LogConversation', data);
  }
}

// Export singleton instance
let grpcClients: GrpcClients | null = null;
let actionExecutor: ServiceActionExecutor | null = null;

export function getGrpcClients(): GrpcClients {
  if (!grpcClients) {
    grpcClients = initGrpcClients();
  }
  return grpcClients;
}

export function getActionExecutor(): ServiceActionExecutor {
  if (!actionExecutor) {
    actionExecutor = new ServiceActionExecutor(getGrpcClients());
  }
  return actionExecutor;
}
