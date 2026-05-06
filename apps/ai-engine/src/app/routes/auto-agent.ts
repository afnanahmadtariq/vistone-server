/**
 * Organization automation: client workspace pipeline (tasks, milestones, assignment).
 */
import { FastifyInstance, FastifyRequest } from 'fastify';
import { runClientWorkspaceAutoAgentPipeline } from '../services/client-workspace-auto-agent.service';
import { runWithServiceRequestContextAsync } from '../services/request-context';

function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const t = authHeader.slice(7).trim();
  return t || null;
}

export default async function autoAgentRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { projectId?: string; channelId?: string; organizationId?: string; forceExecute?: boolean };
  }>('/api/auto-agent/client-workspace', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    const role = request.user.role?.toLowerCase();
    if (role !== 'organizer') {
      return reply.status(403).send({ error: 'Only organizers can run workspace automation' });
    }

    const token = extractBearerToken(request);
    const organizationId = request.user.organizationId?.trim();
    if (!token || !organizationId) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { projectId, channelId } = request.body || {};
    if (typeof projectId !== 'string' || !projectId.trim()) {
      return reply.status(400).send({ error: 'projectId is required' });
    }
    if (typeof channelId !== 'string' || !channelId.trim()) {
      return reply.status(400).send({ error: 'channelId is required' });
    }

    try {
      const result = await runWithServiceRequestContextAsync({ token, organizationId }, () =>
        runClientWorkspaceAutoAgentPipeline(request.user!, {
          projectId: projectId.trim(),
          channelId: channelId.trim(),
          organizationId: request.body?.organizationId?.trim() || organizationId,
          forceExecute: !!request.body?.forceExecute,
        })
      );
      if (!result.success && result.error) {
        const code = result.skippedReason === 'all_steps_disabled' ? 400 : 500;
        return reply.status(code).send(result);
      }
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Automation failed';
      request.log.error(err, 'client-workspace auto-agent');
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
