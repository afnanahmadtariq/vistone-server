import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request auth context for forwarding to internal microservices (ALS). */
export interface GatewayAuthStore {
  bearerToken?: string;
  /** From incoming `x-organization-id` — same workspace as the GraphQL `auth/me` context. */
  organizationId?: string;
}

export const gatewayAuthStore = new AsyncLocalStorage<GatewayAuthStore>();
