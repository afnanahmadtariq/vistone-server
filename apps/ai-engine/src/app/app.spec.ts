import Fastify, { FastifyInstance } from 'fastify';
import { app } from './app';

describe('GET /', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = Fastify();
    server.register(app);
  });

  it('should respond with a message', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.json()).toEqual({
      message: 'Vistone AI Engine API',
      version: '1.0.0',
      endpoints: {
        chat: 'POST /api/chat',
        clearHistory: 'DELETE /api/chat/history/:sessionId',
        indexDocument: 'POST /api/index/document',
        removeDocument: 'DELETE /api/index/document',
        stats: 'GET /api/chat/stats/:organizationId',
        syncAll: 'POST /api/sync/all',
        syncType: 'POST /api/sync/:type',
      },
    });
  });
});
