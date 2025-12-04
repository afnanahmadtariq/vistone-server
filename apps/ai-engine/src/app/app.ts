import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

// Plugins
import authPlugin from './plugins/auth';
import sensiblePlugin from './plugins/sensible';

// Routes
import rootRoutes from './routes/root';
import chatRoutes from './routes/chat';
import syncRoutes from './routes/sync';

/* eslint-disable-next-line */
export interface AppOptions {}

export async function app(fastify: FastifyInstance, opts: AppOptions) {
  // Enable CORS
  fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Register plugins
  fastify.register(sensiblePlugin, opts);
  fastify.register(authPlugin, opts);

  // Register routes
  fastify.register(rootRoutes, opts);
  fastify.register(chatRoutes, opts);
  fastify.register(syncRoutes, opts);
}
