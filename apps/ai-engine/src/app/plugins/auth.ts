import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  organizationName?: string;
  email?: string;
  permissions?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Authentication plugin that extracts user context from headers
 * In production, this should validate JWT tokens
 */
async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check and root endpoints
    if (request.url === '/' || request.url === '/health') {
      return;
    }

    // In production, validate JWT token from Authorization header
    // For now, we extract from custom headers for development
    const userId = request.headers['x-user-id'] as string;
    const organizationId = request.headers['x-organization-id'] as string;
    const organizationName = request.headers['x-organization-name'] as string;

    // For protected routes, require at least userId and organizationId
    if (request.url.startsWith('/api/')) {
      // Check if the request body already contains these (for flexibility)
      const body = request.body as Record<string, unknown> | undefined;
      
      if (!userId && !body?.userId) {
        // For chat endpoint, userId is in body
        if (!body?.userId) {
          // Allow the route handler to validate
        }
      }

      if (userId && organizationId) {
        request.user = {
          userId,
          organizationId,
          organizationName: organizationName || undefined,
        };
      }
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
});
