/**
 * AI Engine — Root/Health Routes
 */
import { FastifyInstance } from 'fastify';

export default async function rootRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => ({
    service: 'AI Engine',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      chat: 'POST /api/chat',
      clearHistory: 'DELETE /api/chat/history/:sessionId',
      syncAll: 'POST /api/sync/all',
      syncType: 'POST /api/sync/:type',
      syncDocument: 'POST /api/sync/document',
      stats: 'GET /api/sync/stats/:organizationId',
    },
  }));

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));
}
