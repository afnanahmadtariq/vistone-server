import { FastifyInstance } from 'fastify';
import { config } from '../config/env';

export default async function (fastify: FastifyInstance) {
  // Root endpoint
  fastify.get('/', async function () {
    return {
      service: 'Vistone AI Engine',
      version: '1.0.0',
      description: 'RAG-powered AI assistant with Mistral 8x7B and Pinecone',
      endpoints: {
        chat: 'POST /chat',
        chatHistory: 'GET /chat/:sessionId/history',
        clearChat: 'DELETE /chat/:sessionId',
        search: 'POST /search',
        syncEntity: 'POST /sync/entity',
        syncBulk: 'POST /sync/bulk',
        health: 'GET /health',
      },
    };
  });

  // Health check endpoint
  fastify.get('/health', async function () {
    const checks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mistral: {
          configured: !!config.mistral.apiKey,
          model: config.mistral.model,
        },
        pinecone: {
          configured: !!config.pinecone.apiKey,
          index: config.pinecone.indexName,
        },
        grpc: {
          authService: config.grpc.authService,
          projectService: config.grpc.projectService,
          workforceService: config.grpc.workforceService,
          clientService: config.grpc.clientService,
          knowledgeService: config.grpc.knowledgeService,
          communicationService: config.grpc.communicationService,
          notificationService: config.grpc.notificationService,
          monitoringService: config.grpc.monitoringService,
        },
      },
    };

    return checks;
  });
}
