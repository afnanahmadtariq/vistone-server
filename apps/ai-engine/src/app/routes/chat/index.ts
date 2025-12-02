import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRAGInstance, deleteRAGInstance } from '../../services/rag-chain';
import { v4 as uuidv4 } from 'uuid';

interface ChatRequestBody {
  message: string;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
  executeActions?: boolean;
}

interface ChatResponse {
  sessionId: string;
  answer: string;
  action?: {
    type: string;
    executed: boolean;
    result?: any;
    error?: string;
  };
  context: {
    documentsUsed: number;
    relevanceScores: number[];
  };
  tokensUsed?: number;
}

export default async function (fastify: FastifyInstance) {
  // Chat endpoint
  fastify.post<{ Body: ChatRequestBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string' },
            sessionId: { type: 'string' },
            userId: { type: 'string' },
            organizationId: { type: 'string' },
            executeActions: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              answer: { type: 'string' },
              action: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  executed: { type: 'boolean' },
                  result: { type: 'object' },
                  error: { type: 'string' },
                },
              },
              context: {
                type: 'object',
                properties: {
                  documentsUsed: { type: 'number' },
                  relevanceScores: { type: 'array', items: { type: 'number' } },
                },
              },
              tokensUsed: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatRequestBody }>, reply: FastifyReply) => {
      const { message, sessionId: providedSessionId, userId, organizationId, executeActions = true } = request.body;

      const sessionId = providedSessionId || uuidv4();
      const rag = getRAGInstance(sessionId);

      try {
        const response = await rag.chat(message, userId, organizationId, executeActions);

        const chatResponse: ChatResponse = {
          sessionId,
          answer: response.answer,
          action: response.action,
          context: response.context,
          tokensUsed: response.tokensUsed,
        };

        return reply.send(chatResponse);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Chat failed',
          message: error.message,
        });
      }
    }
  );

  // Get conversation history
  fastify.get<{ Params: { sessionId: string } }>(
    '/:sessionId/history',
    {
      schema: {
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              sessionId: { type: 'string' },
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    role: { type: 'string' },
                    content: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const rag = getRAGInstance(sessionId);

      return reply.send({
        sessionId,
        history: rag.getHistory(),
      });
    }
  );

  // Clear conversation history
  fastify.delete<{ Params: { sessionId: string } }>(
    '/:sessionId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      deleteRAGInstance(sessionId);

      return reply.send({
        message: 'Session cleared successfully',
      });
    }
  );

  // Clear only history but keep session
  fastify.post<{ Params: { sessionId: string } }>(
    '/:sessionId/clear',
    {
      schema: {
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const { sessionId } = request.params;
      const rag = getRAGInstance(sessionId);
      rag.clearHistory();

      return reply.send({
        message: 'Conversation history cleared',
      });
    }
  );
}
