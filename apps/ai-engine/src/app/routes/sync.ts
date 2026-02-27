import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  syncAllData,
  syncOrganizationOverview,
  syncOrganizationMembers,
  syncProjects,
  syncTasks,
  syncMilestones,
  syncRisks,
  syncWikiPages,
  syncDocuments,
  syncTeams,
  syncClients,
  syncProposals,
} from '../services/data-sync.service';
import { indexDocument, removeDocument, type DocumentToIndex } from '../services/indexing.service';

interface SyncRequestBody {
  organizationId: string;
}

interface SyncTypeParams {
  type: string;
}

type IndexDocumentBody = DocumentToIndex;

interface RemoveDocumentBody {
  sourceSchema: string;
  sourceTable: string;
  sourceId: string;
}

export default async function syncRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/sync/all
   * Sync all data for an organization
   */
  fastify.post<{ Body: SyncRequestBody }>(
    '/api/sync/all',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId'],
          properties: {
            organizationId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SyncRequestBody }>, reply: FastifyReply) => {
      try {
        const { organizationId } = request.body;
        
        fastify.log.info({ organizationId }, 'Starting full data sync');
        
        const result = await syncAllData(organizationId);
        
        fastify.log.info({ 
          organizationId, 
          totalSynced: result.totalSynced,
          totalErrors: result.totalErrors 
        }, 'Data sync completed');

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to sync data',
        });
      }
    }
  );

  /**
   * POST /api/sync/:type
   * Sync specific data type for an organization
   */
  fastify.post<{ Params: SyncTypeParams; Body: SyncRequestBody }>(
    '/api/sync/:type',
    {
      schema: {
        params: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { 
              type: 'string',
              enum: ['organization', 'members', 'projects', 'tasks', 'milestones', 'risks', 'wiki', 'documents', 'teams', 'clients', 'proposals']
            },
          },
        },
        body: {
          type: 'object',
          required: ['organizationId'],
          properties: {
            organizationId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: SyncTypeParams; Body: SyncRequestBody }>, reply: FastifyReply) => {
      try {
        const { type } = request.params;
        const { organizationId } = request.body;

        const syncFunctions: Record<string, (orgId: string) => Promise<{ synced: number; errors: string[] }>> = {
          organization: syncOrganizationOverview,
          members: syncOrganizationMembers,
          projects: syncProjects,
          tasks: syncTasks,
          milestones: syncMilestones,
          risks: syncRisks,
          wiki: syncWikiPages,
          documents: syncDocuments,
          teams: syncTeams,
          clients: syncClients,
          proposals: syncProposals,
        };

        const syncFn = syncFunctions[type];
        if (!syncFn) {
          return reply.status(400).send({
            success: false,
            error: `Unknown sync type: ${type}`,
          });
        }

        const result = await syncFn(organizationId);

        return reply.send({
          success: true,
          data: {
            type,
            ...result,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to sync data',
        });
      }
    }
  );

  /**
   * POST /api/index/document
   * Index a single document (for real-time updates)
   */
  fastify.post<{ Body: IndexDocumentBody }>(
    '/api/index/document',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'sourceSchema', 'sourceTable', 'sourceId', 'title', 'content', 'contentType'],
          properties: {
            organizationId: { type: 'string' },
            sourceSchema: { type: 'string' },
            sourceTable: { type: 'string' },
            sourceId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            contentType: { type: 'string' },
            metadata: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: IndexDocumentBody }>, reply: FastifyReply) => {
      try {
        const result = await indexDocument(request.body);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to index document',
        });
      }
    }
  );

  /**
   * DELETE /api/index/document
   * Remove a document from the index
   */
  fastify.delete<{ Body: RemoveDocumentBody }>(
    '/api/index/document',
    {
      schema: {
        body: {
          type: 'object',
          required: ['sourceSchema', 'sourceTable', 'sourceId'],
          properties: {
            sourceSchema: { type: 'string' },
            sourceTable: { type: 'string' },
            sourceId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RemoveDocumentBody }>, reply: FastifyReply) => {
      try {
        const { sourceSchema, sourceTable, sourceId } = request.body;
        const removed = await removeDocument(sourceSchema, sourceTable, sourceId);

        return reply.send({
          success: true,
          data: { removed },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to remove document',
        });
      }
    }
  );
}
