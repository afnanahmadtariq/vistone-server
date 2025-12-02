import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDataSyncService, SyncableData } from '../../services/data-sync';

interface SyncEntityBody {
  id: string;
  type: 'project' | 'task' | 'user' | 'team' | 'client' | 'document' | 'wiki' | 'message' | 'notification';
  source: string;
  organizationId?: string;
  content: string;
  additionalInfo?: Record<string, any>;
}

interface SyncProjectBody {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
}

interface SyncTaskBody {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  organizationId?: string;
}

interface SyncUserBody {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
}

interface SyncTeamBody {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  managerId?: string;
  memberCount?: number;
}

interface SyncClientBody {
  id: string;
  name: string;
  contactInfo?: string;
  portalAccess?: boolean;
  organizationId?: string;
}

interface SyncWikiPageBody {
  id: string;
  title: string;
  content?: string;
  parentId?: string;
  organizationId?: string;
}

interface SyncDocumentBody {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  metadata?: string;
}

interface DeleteEntityBody {
  entityId: string;
}

interface BulkSyncBody {
  entities: SyncableData[];
}

export default async function (fastify: FastifyInstance) {
  const syncService = getDataSyncService();

  // Generic entity sync endpoint
  fastify.post<{ Body: SyncEntityBody }>(
    '/entity',
    {
      schema: {
        body: {
          type: 'object',
          required: ['id', 'type', 'source', 'content'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['project', 'task', 'user', 'team', 'client', 'document', 'wiki', 'message', 'notification'] },
            source: { type: 'string' },
            organizationId: { type: 'string' },
            content: { type: 'string' },
            additionalInfo: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              chunkIds: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SyncEntityBody }>, reply: FastifyReply) => {
      try {
        const chunkIds = await syncService.syncEntity(request.body);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // Bulk sync endpoint
  fastify.post<{ Body: BulkSyncBody }>(
    '/bulk',
    {
      schema: {
        body: {
          type: 'object',
          required: ['entities'],
          properties: {
            entities: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'type', 'source', 'content'],
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  source: { type: 'string' },
                  organizationId: { type: 'string' },
                  content: { type: 'string' },
                  additionalInfo: { type: 'object' },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: BulkSyncBody }>, reply: FastifyReply) => {
      try {
        await syncService.syncEntities(request.body.entities);
        return reply.send({ success: true, count: request.body.entities.length });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // Delete entity endpoint
  fastify.delete<{ Body: DeleteEntityBody }>(
    '/entity',
    {
      schema: {
        body: {
          type: 'object',
          required: ['entityId'],
          properties: {
            entityId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: DeleteEntityBody }>, reply: FastifyReply) => {
      try {
        await syncService.removeEntity(request.body.entityId);
        return reply.send({ success: true });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  // Specific type sync endpoints
  fastify.post<{ Body: SyncProjectBody }>(
    '/project',
    async (request: FastifyRequest<{ Body: SyncProjectBody }>, reply: FastifyReply) => {
      try {
        const chunkIds = await syncService.syncProject(request.body);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.post<{ Body: SyncTaskBody }>(
    '/task',
    async (request: FastifyRequest<{ Body: SyncTaskBody }>, reply: FastifyReply) => {
      try {
        const { organizationId, ...taskData } = request.body;
        const chunkIds = await syncService.syncTask(taskData, organizationId);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.post<{ Body: SyncUserBody }>(
    '/user',
    async (request: FastifyRequest<{ Body: SyncUserBody }>, reply: FastifyReply) => {
      try {
        const { organizationId, ...userData } = request.body;
        const chunkIds = await syncService.syncUser(userData, organizationId);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.post<{ Body: SyncTeamBody }>(
    '/team',
    async (request: FastifyRequest<{ Body: SyncTeamBody }>, reply: FastifyReply) => {
      try {
        const chunkIds = await syncService.syncTeam(request.body);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.post<{ Body: SyncClientBody }>(
    '/client',
    async (request: FastifyRequest<{ Body: SyncClientBody }>, reply: FastifyReply) => {
      try {
        const { organizationId, ...clientData } = request.body;
        const chunkIds = await syncService.syncClient(clientData, organizationId);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.post<{ Body: SyncWikiPageBody }>(
    '/wiki',
    async (request: FastifyRequest<{ Body: SyncWikiPageBody }>, reply: FastifyReply) => {
      try {
        const { organizationId, ...pageData } = request.body;
        const chunkIds = await syncService.syncWikiPage(pageData, organizationId);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  fastify.post<{ Body: SyncDocumentBody }>(
    '/document',
    async (request: FastifyRequest<{ Body: SyncDocumentBody }>, reply: FastifyReply) => {
      try {
        const chunkIds = await syncService.syncDocument(request.body);
        return reply.send({ success: true, chunkIds });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
      }
    }
  );
}
