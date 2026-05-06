/**
 * AI Engine — Lazy HTTP Connectors
 * HTTP clients for calling other microservices.
 * Forward the same JWT + X-Organization-Id as the user's chat request (via AsyncLocalStorage).
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config';
import { getServiceRequestContext } from './request-context';

function attachOutboundAuth(client: AxiosInstance): AxiosInstance {
  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const ctx = getServiceRequestContext();
    if (ctx?.token) {
      req.headers.Authorization = `Bearer ${ctx.token}`;
    }
    if (ctx?.organizationId) {
      req.headers['X-Organization-Id'] = ctx.organizationId;
    }
    return req;
  });
  return client;
}

// ── Generic service client ─────────────────────────────────────

function createClient(baseURL: string, timeout = 15000): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout,
    headers: { 'Content-Type': 'application/json' },
  });
  return attachOutboundAuth(client);
}

// ── Lazy singleton clients ─────────────────────────────────────

let _auth: AxiosInstance | null = null;
let _project: AxiosInstance | null = null;
let _client: AxiosInstance | null = null;
let _workforce: AxiosInstance | null = null;
let _communication: AxiosInstance | null = null;
let _notification: AxiosInstance | null = null;
let _knowledge: AxiosInstance | null = null;

export function authServiceClient() {
  return (_auth ??= createClient(config.services.auth));
}

export function projectClient() {
  return (_project ??= createClient(config.services.project));
}
export function clientClient() {
  return (_client ??= createClient(config.services.client));
}
export function workforceClient() {
  return (_workforce ??= createClient(config.services.workforce));
}
export function communicationClient() {
  return (_communication ??= createClient(config.services.communication));
}
export function notificationClient() {
  return (_notification ??= createClient(config.services.notification));
}
export function knowledgeClient() {
  return (_knowledge ??= createClient(config.services.knowledge));
}

// ── Safe call helper ────────────────────────────────────────────

export async function safeCall<T>(
  fn: () => Promise<{ data: T }>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const res = await fn();
    return { success: true, data: res.data };
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
    const message =
      axiosErr.response?.data?.error ||
      axiosErr.response?.data?.message ||
      axiosErr.message ||
      'Service call failed';
    return { success: false, error: message };
  }
}
