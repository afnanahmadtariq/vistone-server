/**
 * AI Engine — Shared Database Layer
 * Single pg.Pool + lazy Prisma initialization.
 * All database access goes through this module.
 */
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

let prismaClient: any = null;

export async function getPrisma() {
    if (!prismaClient) {
        // Dynamic import to avoid loading Prisma at startup
        const { PrismaPg } = await import('@prisma/adapter-pg');
        const { PrismaClient } = await import('../../node_modules/.prisma/ai-engine-client');
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
