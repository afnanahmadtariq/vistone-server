import { embedDocument, deleteDocumentEmbeddings } from './embedding';
import { VectorMetadata } from './pinecone';

// Data sync service for embedding app data into vector store
// This service will be called by other services via gRPC when data changes

export interface SyncableData {
  id: string;
  type: VectorMetadata['type'];
  source: string;
  organizationId?: string;
  content: string;
  additionalInfo?: Record<string, any>;
}

export class DataSyncService {
  // Sync a single entity
  async syncEntity(data: SyncableData): Promise<string[]> {
    const metadata: Omit<VectorMetadata, 'content' | 'timestamp'> = {
      source: data.source,
      type: data.type,
      entityId: data.id,
      organizationId: data.organizationId,
      additionalInfo: data.additionalInfo,
    };

    return embedDocument(data.content, metadata);
  }

  // Sync multiple entities
  async syncEntities(entities: SyncableData[]): Promise<void> {
    for (const entity of entities) {
      await this.syncEntity(entity);
    }
  }

  // Remove entity from vector store
  async removeEntity(entityId: string): Promise<void> {
    await deleteDocumentEmbeddings(entityId);
  }

  // === Specific data type sync methods ===

  async syncProject(project: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    budget?: string;
  }): Promise<string[]> {
    const content = `Project: ${project.name}
Description: ${project.description || 'No description'}
Status: ${project.status}
Start Date: ${project.startDate || 'Not set'}
End Date: ${project.endDate || 'Not set'}
Budget: ${project.budget || 'Not set'}`;

    return this.syncEntity({
      id: project.id,
      type: 'project',
      source: 'project-management',
      organizationId: project.organizationId,
      content,
      additionalInfo: {
        name: project.name,
        status: project.status,
      },
    });
  }

  async syncTask(task: {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
  }, organizationId?: string): Promise<string[]> {
    const content = `Task: ${task.title}
Project ID: ${task.projectId}
Description: ${task.description || 'No description'}
Status: ${task.status}
Priority: ${task.priority || 'Normal'}
Assignee: ${task.assigneeId || 'Unassigned'}
Due Date: ${task.dueDate || 'No due date'}`;

    return this.syncEntity({
      id: task.id,
      type: 'task',
      source: 'project-management',
      organizationId,
      content,
      additionalInfo: {
        projectId: task.projectId,
        title: task.title,
        status: task.status,
        priority: task.priority,
      },
    });
  }

  async syncUser(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }, organizationId?: string): Promise<string[]> {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown';
    const content = `User: ${fullName}
Email: ${user.email}`;

    return this.syncEntity({
      id: user.id,
      type: 'user',
      source: 'auth-service',
      organizationId,
      content,
      additionalInfo: {
        email: user.email,
        name: fullName,
      },
    });
  }

  async syncTeam(team: {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    managerId?: string;
    memberCount?: number;
  }): Promise<string[]> {
    const content = `Team: ${team.name}
Description: ${team.description || 'No description'}
Manager ID: ${team.managerId || 'No manager'}
Members: ${team.memberCount || 0}`;

    return this.syncEntity({
      id: team.id,
      type: 'team',
      source: 'workforce-management',
      organizationId: team.organizationId,
      content,
      additionalInfo: {
        name: team.name,
      },
    });
  }

  async syncClient(client: {
    id: string;
    name: string;
    contactInfo?: string;
    portalAccess?: boolean;
  }, organizationId?: string): Promise<string[]> {
    const content = `Client: ${client.name}
Contact Info: ${client.contactInfo || 'No contact info'}
Portal Access: ${client.portalAccess ? 'Enabled' : 'Disabled'}`;

    return this.syncEntity({
      id: client.id,
      type: 'client',
      source: 'client-management',
      organizationId,
      content,
      additionalInfo: {
        name: client.name,
      },
    });
  }

  async syncWikiPage(page: {
    id: string;
    title: string;
    content?: string;
    parentId?: string;
  }, organizationId?: string): Promise<string[]> {
    const content = `Wiki Page: ${page.title}
Content: ${page.content || 'Empty page'}`;

    return this.syncEntity({
      id: page.id,
      type: 'wiki',
      source: 'knowledge-hub',
      organizationId,
      content,
      additionalInfo: {
        title: page.title,
        parentId: page.parentId,
      },
    });
  }

  async syncDocument(doc: {
    id: string;
    organizationId: string;
    name: string;
    url: string;
    metadata?: string;
  }): Promise<string[]> {
    const content = `Document: ${doc.name}
URL: ${doc.url}
Metadata: ${doc.metadata || 'No metadata'}`;

    return this.syncEntity({
      id: doc.id,
      type: 'document',
      source: 'knowledge-hub',
      organizationId: doc.organizationId,
      content,
      additionalInfo: {
        name: doc.name,
        url: doc.url,
      },
    });
  }

  async syncMessage(message: {
    id: string;
    channelId: string;
    senderId: string;
    content: string;
  }, organizationId?: string): Promise<string[]> {
    const content = `Message in channel ${message.channelId}:
From: ${message.senderId}
Content: ${message.content}`;

    return this.syncEntity({
      id: message.id,
      type: 'message',
      source: 'communication',
      organizationId,
      content,
      additionalInfo: {
        channelId: message.channelId,
        senderId: message.senderId,
      },
    });
  }
}

// Singleton instance
let dataSyncService: DataSyncService | null = null;

export function getDataSyncService(): DataSyncService {
  if (!dataSyncService) {
    dataSyncService = new DataSyncService();
  }
  return dataSyncService;
}
