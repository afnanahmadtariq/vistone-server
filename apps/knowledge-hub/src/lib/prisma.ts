import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Dynamic import to handle dist folder path resolution
const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'knowledge-client');
const { PrismaClient } = require(clientPath);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
