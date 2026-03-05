/**
 * AI Engine — Shared Database Layer
 * Single pg.Pool + lazy Prisma initialization.
 * All database access goes through this module.
 */
import * as path from 'path';
import { Pool } from 'pg';
import { config } from './config';

// ── Single shared pg.Pool ───────────────────────────────────────
let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: config.db.url,
            max: config.db.pool.max,
            idleTimeoutMillis: config.db.pool.idleTimeoutMillis,
            connectionTimeoutMillis: config.db.pool.connectionTimeoutMillis,
        });
        pool.on('error', (err) => {
            console.error('[DB] Pool error:', err.message);
        });
    }
    return pool;
}

// ── Lazy Prisma Client ──────────────────────────────────────────
// Only initialized when first requested. Uses the shared pool.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaClient: any = null;

export async function getPrisma() {
    if (!prismaClient) {
        // Dynamic import to avoid loading Prisma at startup
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - dynamic Prisma client import
        const { PrismaPg } = await import('@prisma/adapter-pg');
        // Use path.join + require to resolve at runtime from cwd, not relative to source file
        const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'ai-engine-client');
        const { PrismaClient } = require(clientPath);
        const adapter = new PrismaPg(getPool());
        prismaClient = new PrismaClient({ adapter });
    }
    return prismaClient;
}

// ── Query Helper ────────────────────────────────────────────────
// Direct SQL queries using the shared pool.

export async function query(text: string, params?: unknown[]) {
    const client = await getPool().connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

// ── Cleanup ─────────────────────────────────────────────────────
export async function closeDb() {
    if (prismaClient) {
        await prismaClient.$disconnect();
        prismaClient = null;
    }
    if (pool) {
        await pool.end();
        pool = null;
    }
}
