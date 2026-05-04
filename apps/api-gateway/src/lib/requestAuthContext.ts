import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request bearer token for forwarding to internal microservices (ALS). */
export interface GatewayAuthStore {
  bearerToken?: string;
}

export const gatewayAuthStore = new AsyncLocalStorage<GatewayAuthStore>();
