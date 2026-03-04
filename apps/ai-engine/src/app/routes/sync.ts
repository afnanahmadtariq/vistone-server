/**
 * AI Engine — Sync Routes
 * Data synchronization endpoints. Only accessible to users with settings:update permission.
 */
import { FastifyInstance } from 'fastify';
import { hasPermission } from '../services/rbac.service';
import {
  syncAllData,
  syncProjects,
  syncTasks,
  syncTeams,
  syncMembers,
  syncClients,
  syncMilestones,
  syncRisks,
  syncWikiPages,
  syncDocuments,
  syncProposals,
  getIndexingStats,
  indexDocument,
  type DocumentToIndex,
} from '../services/sync.service';

type SyncType =
  | 'projects' | 'tasks' | 'teams' | 'members'
  | 'clients' | 'milestones' | 'risks'
  | 'wiki' | 'documents' | 'proposals';

const syncFunctions: Record<SyncType, (orgId: string) => Promise<{ synced: number; errors: string[] }>> = {
  projects: syncProjects,
  tasks: syncTasks,
  teams: syncTeams,
  members: syncMembers,
  clients: syncClients,
  milestones: syncMilestones,
  risks: syncRisks,
  wiki: syncWikiPages,
  documents: syncDocuments,
  proposals: syncProposals,
};

export default async function syncRoutes(fastify: FastifyInstance) {
  // ── POST /api/sync/all ────────────────────────────────────────
  fastify.post<{
    Body: { organizationId?: string };
  }>('/api/sync/all', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // Only users with settings:update can trigger sync
    if (!hasPermission(request.user, 'settings', 'update')) {
      return reply.status(403).send({ error: 'Forbidden: settings:update permission required' });
    }

    const orgId = request.body.organizationId || request.user.organizationId;

    try {
      const result = await syncAllData(orgId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      request.log.error(err, 'Sync all error');
      return reply.status(500).send({ error: message });
    }
  });

  // ── POST /api/sync/:type ──────────────────────────────────────
  fastify.post<{
    Params: { type: string };
    Body: { organizationId?: string };
  }>('/api/sync/:type', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (!hasPermission(request.user, 'settings', 'update')) {
      return reply.status(403).send({ error: 'Forbidden: settings:update permission required' });
    }

    const { type } = request.params;
    const syncFn = syncFunctions[type as SyncType];

    if (!syncFn) {
      return reply.status(400).send({
        error: `Invalid sync type: ${type}`,
        validTypes: Object.keys(syncFunctions),
      });
    }

    const orgId = request.body.organizationId || request.user.organizationId;

    try {
      const result = await syncFn(orgId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      return reply.status(500).send({ error: message });
    }
  });

  // ── POST /api/sync/document ───────────────────────────────────
  // Index a single document
  fastify.post<{
    Body: DocumentToIndex;
  }>('/api/sync/document', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (!hasPermission(request.user, 'settings', 'update')) {
      return reply.status(403).send({ error: 'Forbidden: settings:update permission required' });
    }

    try {
      const indexed = await indexDocument(request.body);
      return reply.send({ indexed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Indexing failed';
      return reply.status(500).send({ error: message });
    }
  });

  // ── GET /api/sync/stats/:organizationId ───────────────────────
  fastify.get<{
    Params: { organizationId: string };
  }>('/api/sync/stats/:organizationId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const stats = await getIndexingStats(request.params.organizationId);
      return reply.send(stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get stats';
      return reply.status(500).send({ error: message });
    }
  });
}
