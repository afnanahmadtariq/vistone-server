import type { Request, RequestHandler, Response, NextFunction } from 'express';

export interface InternalAuthUser {
  id: string;
  email: string;
  role: string;
  status?: string;
  organizationId: string | null;
}

export type RequestWithInternalUser = Request & { internalUser?: InternalAuthUser };

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
