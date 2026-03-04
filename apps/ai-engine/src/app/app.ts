/**
 * AI Engine — App Plugin Registration
 * Simplified: auth + 3 route modules (root, chat, sync).
 * No barrel exports — each route is imported directly.
 */
import { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import auth from './plugins/auth';
import rootRoutes from './routes/root';
import chatRoutes from './routes/chat';
import syncRoutes from './routes/sync';

export default async function app(fastify: FastifyInstance) {
  // Plugins
  await fastify.register(cors, { origin: true });
  await fastify.register(sensible);
  await fastify.register(auth);

  // Routes
  await fastify.register(rootRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(syncRoutes);
}
