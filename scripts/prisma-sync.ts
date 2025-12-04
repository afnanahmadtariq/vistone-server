#!/usr/bin/env ts-node
/**
 * Prisma Sync Script
 * Handles database schema synchronization and client generation for all microservices.
 * 
 * Usage:
 *   npx ts-node scripts/prisma-sync.ts [command] [options]
 * 
 * Commands:
 *   generate     Generate Prisma clients for all services
 *   push         Push schemas to database (development only)
 *   sync         Generate clients + push schemas (development)
 *   validate     Validate all Prisma schemas
 * 
 * Options:
 *   --service=<name>  Run for specific service only
 *   --prod            Production mode (skips db push)
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import 'dotenv/config';

// Services with Prisma schemas
const PRISMA_SERVICES = [
  'auth-service',
  'workforce-management',
  'project-management',
  'client-management',
  'knowledge-hub',
  'communication',
  'monitoring-reporting',
  'notification',
  'ai-engine',
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string, service: string) {
  log(`\n[${step}] ${service}`, 'cyan');
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠ ${message}`, 'yellow');
}

interface SyncOptions {
  command: 'generate' | 'push' | 'sync' | 'validate';
  service?: string;
  isProd: boolean;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const command = (args[0] || 'sync') as SyncOptions['command'];
  
  let service: string | undefined;
  let isProd = false;

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--service=')) {
      service = arg.replace('--service=', '');
    } else if (arg === '--prod') {
      isProd = true;
    }
  }

  // Also check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    isProd = true;
  }

  return { command, service, isProd };
}

function getServicesToProcess(specificService?: string): string[] {
  if (specificService) {
    if (!PRISMA_SERVICES.includes(specificService)) {
      throw new Error(`Unknown service: ${specificService}. Available: ${PRISMA_SERVICES.join(', ')}`);
    }
    return [specificService];
  }
  return PRISMA_SERVICES;
}

function getSchemaPath(service: string): string {
  return path.join(process.cwd(), 'apps', service, 'prisma', 'schema.prisma');
}

function getConfigPath(service: string): string {
  return path.join(process.cwd(), 'apps', service, 'prisma.config.ts');
}

function hasSchema(service: string): boolean {
  return fs.existsSync(getSchemaPath(service));
}

function hasConfig(service: string): boolean {
  return fs.existsSync(getConfigPath(service));
}

function runPrismaCommand(service: string, command: string, skipOnError = false): boolean {
  const schemaPath = getSchemaPath(service);
  const configPath = getConfigPath(service);
  
  if (!hasSchema(service)) {
    logWarning(`No schema.prisma found for ${service}`);
    return true;
  }

  // For Prisma 7+, use --config if available, otherwise fallback to --schema
  const configArg = hasConfig(service) 
    ? `--config="${configPath}"` 
    : `--schema="${schemaPath}"`;

  try {
    execSync(`npx prisma ${command} ${configArg}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env },
    });
    return true;
  } catch (error) {
    if (skipOnError) {
      logWarning(`Command failed for ${service}, continuing...`);
      return true;
    }
    logError(`Command failed for ${service}`);
    return false;
  }
}

function generateClients(services: string[]): boolean {
  log('\n📦 Generating Prisma clients...', 'bright');
  
  let success = true;
  for (const service of services) {
    logStep('generate', service);
    if (!runPrismaCommand(service, 'generate')) {
      success = false;
      break;
    }
    logSuccess(`Generated client for ${service}`);
  }
  
  return success;
}

function pushSchemas(services: string[]): boolean {
  log('\n🔄 Pushing schemas to database...', 'bright');
  
  let success = true;
  for (const service of services) {
    logStep('db push', service);
    // Use --accept-data-loss in dev to avoid interactive prompts
    if (!runPrismaCommand(service, 'db push --accept-data-loss', true)) {
      success = false;
      break;
    }
    logSuccess(`Pushed schema for ${service}`);
  }
  
  return success;
}

function validateSchemas(services: string[]): boolean {
  log('\n🔍 Validating Prisma schemas...', 'bright');
  
  let success = true;
  for (const service of services) {
    logStep('validate', service);
    if (!runPrismaCommand(service, 'validate')) {
      success = false;
    } else {
      logSuccess(`Schema valid for ${service}`);
    }
  }
  
  return success;
}

async function main() {
  const options = parseArgs();
  const services = getServicesToProcess(options.service);

  log(`\n${'='.repeat(60)}`, 'bright');
  log(`🔧 Prisma Sync - ${options.command.toUpperCase()}`, 'bright');
  log(`   Environment: ${options.isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`, 'yellow');
  log(`   Services: ${services.length === PRISMA_SERVICES.length ? 'ALL' : services.join(', ')}`, 'cyan');
  log(`${'='.repeat(60)}`, 'bright');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    logError('DATABASE_URL environment variable is not set!');
    logWarning('Create a .env file with DATABASE_URL or set it in your environment.');
    process.exit(1);
  }

  let success = true;

  switch (options.command) {
    case 'validate':
      success = validateSchemas(services);
      break;

    case 'generate':
      success = generateClients(services);
      break;

    case 'push':
      if (options.isProd) {
        logError('Cannot push schemas in production mode!');
        logWarning('Use migrations for production database changes.');
        process.exit(1);
      }
      success = pushSchemas(services);
      break;

    case 'sync':
      // First push schemas (development only), then generate clients
      if (!options.isProd) {
        success = pushSchemas(services);
      } else {
        log('\n⏭️  Skipping db push in production mode', 'yellow');
      }
      
      if (success) {
        success = generateClients(services);
      }
      break;

    default:
      logError(`Unknown command: ${options.command}`);
      process.exit(1);
  }

  log('\n' + '='.repeat(60), 'bright');
  if (success) {
    logSuccess('All operations completed successfully!');
  } else {
    logError('Some operations failed. Check the logs above.');
    process.exit(1);
  }
}

main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
