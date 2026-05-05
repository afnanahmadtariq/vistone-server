/**
 * AI Engine — Unified Chat Route
 * Single endpoint that handles both informational and action queries.
 * Runs the chat pipeline inside AsyncLocalStorage so outbound HTTP to microservices
 * carries the same Bearer token + X-Organization-Id as this request.
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { chat, clearHistory } from '../services/chat.service';
import { runWithServiceRequestContextAsync } from '../services/request-context';
import type { ChatRequest } from '../types';

function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const t = authHeader.slice(7).trim();
  return t || null;
}

export default async function chatRoutes(fastify: FastifyInstance) {
  // ── POST /api/chat ──────────────────────────────────────────
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

    const token = extractBearerToken(request);
    if (!token) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const organizationId = request.user.organizationId?.trim();
    if (!organizationId) {
      return reply.status(400).send({
        error:
          'No active organization for this session. Select an organization in the app, or call this API with the X-Organization-Id header.',
      });
    }

    try {
      const result = await runWithServiceRequestContextAsync({ token, organizationId }, () =>
        chat(request.user!, query.trim(), sessionId, confirmAction)
      );
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

    const token = extractBearerToken(request);
    const organizationId = request.user.organizationId?.trim();
    if (!token || !organizationId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      await runWithServiceRequestContextAsync({ token, organizationId }, () =>
        clearHistory(request.params.sessionId)
      );
      return reply.send({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clear history';
      return reply.status(500).send({ error: message });
    }
  });
}
