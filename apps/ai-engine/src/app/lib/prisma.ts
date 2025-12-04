import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Find the workspace root by looking for nx.json
function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'nx.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

// Dynamic import to handle dist folder path resolution
const workspaceRoot = findWorkspaceRoot(__dirname);
const clientPath = path.join(workspaceRoot, 'node_modules', '.prisma', 'ai-engine-client');
const { PrismaClient } = require(clientPath);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Singleton pattern for Prisma client
let prismaClient: InstanceType<typeof PrismaClient> | null = null;

export function getPrismaClient(): InstanceType<typeof PrismaClient> {
  if (!prismaClient) {
    prismaClient = new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });
  }
  return prismaClient;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
  await pool.end();
}

// Export the default instance for convenience
export default getPrismaClient();
