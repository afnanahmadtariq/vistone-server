import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { initPinecone } from '../services/pinecone';
import { config } from '../config/env';

/**
 * Plugin to initialize Pinecone vector database connection
 */
export default fp(async function (fastify: FastifyInstance) {
  if (config.pinecone.apiKey) {
    try {
      await initPinecone();
      fastify.log.info('Pinecone initialized successfully');
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to initialize Pinecone');
    }
  } else {
    fastify.log.warn('Pinecone API key not configured. Vector operations will fail.');
  }
});
