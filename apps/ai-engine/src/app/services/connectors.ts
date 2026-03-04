/**
 * AI Engine — Lazy HTTP Connectors
 * HTTP clients for calling other microservices.
 * Created lazily on first use — not at import time.
 */
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

// ── Generic service client ─────────────────────────────────────

function createClient(baseURL: string, timeout = 15000): AxiosInstance {
    return axios.create({
        baseURL,
        timeout,
        headers: { 'Content-Type': 'application/json' },
    });
}

// ── Lazy singleton clients ─────────────────────────────────────

let _project: AxiosInstance | null = null;
let _client: AxiosInstance | null = null;
let _workforce: AxiosInstance | null = null;
let _communication: AxiosInstance | null = null;
let _notification: AxiosInstance | null = null;
let _knowledge: AxiosInstance | null = null;

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
// Wraps service calls with standard error handling.

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
