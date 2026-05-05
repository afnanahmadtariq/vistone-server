/**
 * AI Engine — Auth Plugin
 * Validates JWT via auth-service and loads user's actual DB permissions.
 * Forwards `X-Organization-Id` into POST /auth/me (same contract as API Gateway + microservices).
 */
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import axios from 'axios';
import { config } from '../config';
import type { AuthenticatedUser } from '../types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

function readOrganizationHeader(request: FastifyRequest): string | undefined {
  const raw = request.headers['x-organization-id'];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return undefined;
}

// Simple cache to avoid hitting auth-service on every request
const authCache = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', undefined);

  fastify.addHook('preHandler', async (request: FastifyRequest) => {
    // Skip auth for health/root endpoints
    if (request.url === '/' || request.url === '/health') return;

    // Extract Bearer token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return;

    const token = authHeader.slice(7);
    if (!token) return;

    const requestedOrgId = readOrganizationHeader(request) ?? '';
    const cacheKey = `${token}|${requestedOrgId}`;

    // Check cache first
    const cached = authCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      request.user = cached.user;
      return;
    }

    try {
      const { data } = await axios.post(
        `${config.services.auth}/auth/me`,
        { organizationId: requestedOrgId || undefined },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );

      // Check if user is paused
      if (data.status === 'paused') {
        return; // Don't attach user — downstream will see no user and reject
      }

      const orgId = data.organizationId != null ? String(data.organizationId) : '';

      const user: AuthenticatedUser = {
        id: data.id,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        status: data.status,
        organizationId: orgId,
        organizationName: data.organization?.name,
        permissions: data.permissions || null,
      };

      // Cache the result
      authCache.set(cacheKey, { user, expiresAt: Date.now() + CACHE_TTL });
      request.user = user;
    } catch {
      // Token invalid or auth-service unavailable — proceed without user
    }
  });

  // Periodic cache cleanup
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of authCache.entries()) {
      if (value.expiresAt < now) authCache.delete(key);
    }
  }, 60_000);

  fastify.addHook('onClose', () => {
    clearInterval(cleanupInterval);
    authCache.clear();
  });
}

export default fp(authPlugin, { name: 'auth' });
