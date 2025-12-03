import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async function () {
    return { 
      message: 'Vistone AI Engine API',
      version: '1.0.0',
      endpoints: {
        chat: 'POST /api/chat',
        clearHistory: 'DELETE /api/chat/history/:sessionId',
        stats: 'GET /api/chat/stats/:organizationId',
        syncAll: 'POST /api/sync/all',
        syncType: 'POST /api/sync/:type',
        indexDocument: 'POST /api/index/document',
        removeDocument: 'DELETE /api/index/document',
      },
    };
  });

  fastify.get('/health', async function () {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });
}
