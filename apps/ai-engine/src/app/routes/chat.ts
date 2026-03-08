/**
 * AI Engine — Unified Chat Route
 * Single endpoint that handles both informational and action queries.
 */
import { FastifyInstance } from 'fastify';
import { chat, clearHistory } from '../services/chat.service';
import type { ChatRequest } from '../types';

export default async function chatRoutes(fastify: FastifyInstance) {
  // ── POST /api/chat ──────────────────────────────────────────
  // Unified endpoint: auto-detects info vs action queries.
  fastify.post<{
    Body: ChatRequest;
  }>('/api/chat', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { query, sessionId, confirmAction } = request.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return reply.status(400).send({ error: 'Query is required' });
    }

    try {
      const result = await chat(request.user, query.trim(), sessionId, confirmAction);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      request.log.error(err, 'Chat error');
      return reply.status(500).send({ error: message });
    }
  });

  // ── DELETE /api/chat/history/:sessionId ──────────────────────
  fastify.delete<{
    Params: { sessionId: string };
  }>('/api/chat/history/:sessionId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      await clearHistory(request.params.sessionId);
      return reply.send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clear history';
      return reply.status(500).send({ error: message });
    }
  });
}
