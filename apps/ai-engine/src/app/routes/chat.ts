import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queryWithRag, clearConversationHistory } from '../services/rag.service';
import { getIndexingStats } from '../services/indexing.service';

interface ChatRequestBody {
  organizationId: string;
  organizationName?: string;
  userId: string;
  sessionId?: string;
  query: string;
  contentTypes?: string[];
}

interface ClearHistoryParams {
  sessionId: string;
}

interface StatsParams {
  organizationId: string;
}

export default async function chatRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/chat
   * Main RAG query endpoint
   */
  fastify.post<{ Body: ChatRequestBody }>(
    '/api/chat',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'userId', 'query'],
          properties: {
            organizationId: { type: 'string' },
            organizationName: { type: 'string' },
            userId: { type: 'string' },
            sessionId: { type: 'string' },
            query: { type: 'string', minLength: 1, maxLength: 2000 },
            contentTypes: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  answer: { type: 'string' },
                  sessionId: { type: 'string' },
                  isOutOfScope: { type: 'boolean' },
                  sources: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        contentType: { type: 'string' },
                        title: { type: 'string' },
                        sourceId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      try {
        const { organizationId, organizationName, userId, sessionId, query, contentTypes } = request.body;

        const result = await queryWithRag({
          organizationId,
          organizationName,
          userId,
          sessionId,
          query,
          contentTypes,
        });

        return reply.send({
          success: true,
          data: {
            answer: result.answer,
            sessionId: result.sessionId,
            isOutOfScope: result.isOutOfScope,
            sources: result.sources.map(s => ({
              contentType: s.contentType,
              title: s.title,
              sourceId: s.sourceId,
            })),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to process chat query',
        });
      }
    }
  );

  /**
   * DELETE /api/chat/history/:sessionId
   * Clear conversation history for a session
   */
  fastify.delete<{ Params: ClearHistoryParams }>(
    '/api/chat/history/:sessionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: ClearHistoryParams }>, reply: FastifyReply) => {
      try {
        await clearConversationHistory(request.params.sessionId);
        return reply.send({
          success: true,
          message: 'Conversation history cleared',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to clear conversation history',
        });
      }
    }
  );

  /**
   * GET /api/chat/stats/:organizationId
   * Get indexing statistics for an organization
   */
  fastify.get<{ Params: StatsParams }>(
    '/api/chat/stats/:organizationId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['organizationId'],
          properties: {
            organizationId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: StatsParams }>, reply: FastifyReply) => {
      try {
        const stats = await getIndexingStats(request.params.organizationId);
        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to get statistics',
        });
      }
    }
  );
}
