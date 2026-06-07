import { AsyncLocalStorage } from 'node:async_hooks';

/** Resolved user snapshot forwarded to microservices when `FORWARD_GATEWAY_IDENTITY_TO_SERVICES=true`. */
export interface GatewayForwardedIdentity {
  userId: string;
  email: string;
  role: string;
  status?: string;
  organizationId: string | null;
}

/** Per-request auth context for forwarding to internal microservices (ALS). */
export interface GatewayAuthStore {
  bearerToken?: string;
  /** From incoming `x-organization-id` — same workspace as the GraphQL `auth/me` context. */
  organizationId?: string;
  /** Populated after GraphQL context resolves the user — avoids per-service auth round-trips in dev/VPC. */
  forwardedIdentity?: GatewayForwardedIdentity;
}

export const gatewayAuthStore = new AsyncLocalStorage<GatewayAuthStore>();
