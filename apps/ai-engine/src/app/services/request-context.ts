/**
 * Per-request context for outbound calls to other microservices.
 * Bearer token + org header must match the user's session (same as API Gateway → services).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AiDataScope } from '../types';

export interface ServiceRequestContext {
  token: string;
  organizationId: string;
  /** Computed once per chat request; tools and RAG enforce the same project/client/wiki bounds. */
  aiDataScope?: AiDataScope;
}

const storage = new AsyncLocalStorage<ServiceRequestContext>();

export function runWithServiceRequestContext<T>(ctx: ServiceRequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function runWithServiceRequestContextAsync<T>(ctx: ServiceRequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn) as Promise<T>;
}

export function getServiceRequestContext(): ServiceRequestContext | undefined {
  return storage.getStore();
}
