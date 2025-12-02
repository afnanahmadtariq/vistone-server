import Fastify, { FastifyInstance } from 'fastify';
import { app } from './app';

describe('GET /', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = Fastify();
    server.register(app);
  });

  it('should respond with service info', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    const json = response.json();
    expect(json).toHaveProperty('service', 'Vistone AI Engine');
    expect(json).toHaveProperty('version', '1.0.0');
    expect(json).toHaveProperty('endpoints');
  });
});
