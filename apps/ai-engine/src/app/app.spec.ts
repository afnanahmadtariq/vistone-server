import Fastify, { FastifyInstance } from 'fastify';
import rootRoutes from './routes/root';

describe('GET /', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = Fastify();
    server.register(rootRoutes);
  });

  afterEach(() => server.close());

  it('should respond with a message', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({
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
    });
  });

  it('should respond to health check', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
