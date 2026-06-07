import type { Request, RequestHandler, Response, NextFunction } from 'express';

export interface InternalAuthUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  organizationId: string | null;
}

export type RequestWithInternalUser = Request & { internalUser?: InternalAuthUser };

/** Lowercase header names — gateway sets these; microservices may trust them on private networks only. */
export const GATEWAY_FORWARDED_IDENTITY_HEADERS = {
  USER_ID: 'x-internal-user-id',
  EMAIL: 'x-internal-user-email',
  ROLE: 'x-internal-user-role',
  STATUS: 'x-internal-user-status',
  ORG_ID: 'x-internal-org-id',
} as const;

function firstHeader(req: Request, name: string): string | undefined {
  const v = req.headers[name];
  if (typeof v === 'string') return v.trim() || undefined;
  if (Array.isArray(v) && v.length > 0) return String(v[0]).trim() || undefined;
  return undefined;
}

/**
 * When `TRUST_GATEWAY_IDENTITY_HEADERS=true`, builds `InternalAuthUser` from gateway-forwarded headers
 * and skips auth-service. Intended for dev / private VPC where only the API gateway calls services.
 */
export function parseTrustedGatewayIdentity(req: Request): InternalAuthUser | null {
  if (process.env.TRUST_GATEWAY_IDENTITY_HEADERS !== 'true') {
    return null;
  }

  const id = firstHeader(req, GATEWAY_FORWARDED_IDENTITY_HEADERS.USER_ID);
  if (!id) {
    return null;
  }

  const email = firstHeader(req, GATEWAY_FORWARDED_IDENTITY_HEADERS.EMAIL) ?? '';
  const role = firstHeader(req, GATEWAY_FORWARDED_IDENTITY_HEADERS.ROLE) ?? '';
  const status = firstHeader(req, GATEWAY_FORWARDED_IDENTITY_HEADERS.STATUS);
  const orgFromInternal = firstHeader(req, GATEWAY_FORWARDED_IDENTITY_HEADERS.ORG_ID);
  const orgFromClient = firstHeader(req, 'x-organization-id');
  const organizationIdRaw = orgFromInternal ?? orgFromClient ?? '';
  const organizationId = organizationIdRaw.length > 0 ? organizationIdRaw : null;

  return {
    id,
    email,
    role,
    status,
    organizationId,
  };
}

export interface BearerAuthMiddlewareOptions {
  /** Base URL of auth-service, e.g. http://localhost:3001 (no trailing slash) */
  authServiceUrl: string;
  /** Return true to skip auth for this request (health, OPTIONS, dev bypass). */
  skip?: (req: Request) => boolean;
}

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '');
}

/** Shared skip rules + `SKIP_INTERNAL_SERVICE_AUTH=true` for local scripts without JWT. */
export function defaultInternalAuthSkip(req: Request): boolean {
  if (process.env.SKIP_INTERNAL_SERVICE_AUTH === 'true') return true;
  return req.method === 'OPTIONS' || req.path === '/health' || req.path === '/';
}

/**
 * Validates `Authorization: Bearer <jwt>` by calling auth-service `POST /auth/me`.
 * Forwards optional org selection via `X-Organization-Id` header (same as gateway).
 */
export function bearerAuthMiddleware(options: BearerAuthMiddlewareOptions): RequestHandler {
  const base = normalizeBase(options.authServiceUrl);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (options.skip?.(req)) {
      next();
      return;
    }

    const rreq = req as RequestWithInternalUser;

    const trusted = parseTrustedGatewayIdentity(req);
    if (trusted) {
      if (trusted.status === 'paused') {
        res.status(403).json({ error: 'Account paused' });
        return;
      }
      rreq.internalUser = trusted;
      next();
      return;
    }

    const raw = req.headers.authorization;
    const token =
      typeof raw === 'string' && /^Bearer\s+/i.test(raw.trim())
        ? raw.replace(/^Bearer\s+/i, '').trim()
        : undefined;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const orgHeader = req.headers['x-organization-id'];
    const organizationId =
      typeof orgHeader === 'string'
        ? orgHeader
        : Array.isArray(orgHeader)
          ? orgHeader[0]
          : '';

    try {
      const r = await fetch(`${base}/auth/me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId: organizationId || undefined }),
      });

      if (!r.ok) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const data = (await r.json()) as Record<string, unknown>;
      if (data.status === 'paused') {
        res.status(403).json({ error: 'Account paused' });
        return;
      }

      rreq.internalUser = {
        id: String(data.id ?? ''),
        email: String(data.email ?? ''),
        role: String(data.role ?? ''),
        status: typeof data.status === 'string' ? data.status : undefined,
        organizationId:
          data.organizationId === null || data.organizationId === undefined
            ? null
            : String(data.organizationId),
      };

      next();
    } catch {
      res.status(503).json({ error: 'Authentication service unavailable' });
    }
  };
}
