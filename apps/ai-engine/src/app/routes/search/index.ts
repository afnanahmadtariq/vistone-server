import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { querySimilarDocuments } from '../../services/embedding';

interface SearchBody {
  query: string;
  topK?: number;
  organizationId?: string;
  type?: string;
}

export default async function (fastify: FastifyInstance) {
  // Search endpoint for direct vector search
  fastify.post<{ Body: SearchBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            topK: { type: 'number' },
            organizationId: { type: 'string' },
            type: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    content: { type: 'string' },
                    score: { type: 'number' },
                    metadata: {
                      type: 'object',
                      properties: {
                        source: { type: 'string' },
                        type: { type: 'string' },
                        entityId: { type: 'string' },
                        organizationId: { type: 'string' },
                      },
                    },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SearchBody }>, reply: FastifyReply) => {
      const { query, topK = 5, organizationId, type } = request.body;

      try {
        const filter: Record<string, any> = {};
        if (organizationId) filter.organizationId = organizationId;
        if (type) filter.type = type;

        const results = await querySimilarDocuments(
          query,
          topK,
          Object.keys(filter).length > 0 ? filter : undefined
        );

        return reply.send({
          results: results.map((r) => ({
            content: r.content,
            score: r.score,
            metadata: {
              source: r.metadata.source,
              type: r.metadata.type,
              entityId: r.metadata.entityId,
              organizationId: r.metadata.organizationId,
            },
          })),
          count: results.length,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'Search failed',
          message: error.message,
        });
      }
    }
  );
}
