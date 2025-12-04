import { Pool } from 'pg';
import { indexDocuments, type DocumentToIndex } from './indexing.service';

// Connection pool for direct database access to other schemas
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

/**
 * Sync projects from the project schema
 */
export async function syncProjects(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  const result = await db.query(`
    SELECT 
      p.id,
      p.name,
      p.description,
      p.status,
      p."startDate",
      p."endDate",
      p.budget,
      p.progress
    FROM project.projects p
    WHERE p."organizationId" = $1
      AND p."deletedAt" IS NULL
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'project',
    sourceTable: 'projects',
    sourceId: row.id,
    title: row.name,
    content: row.description || '',
    contentType: 'project',
    metadata: {
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      budget: row.budget?.toString(),
      progress: row.progress,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync tasks from the project schema
 */
export async function syncTasks(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  const result = await db.query(`
    SELECT 
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t."dueDate",
      p.name as "projectName",
      p."organizationId"
    FROM project.tasks t
    JOIN project.projects p ON t."projectId" = p.id
    WHERE p."organizationId" = $1
      AND p."deletedAt" IS NULL
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'project',
    sourceTable: 'tasks',
    sourceId: row.id,
    title: row.title,
    content: row.description || '',
    contentType: 'task',
    metadata: {
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      projectName: row.projectName,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync milestones from the project schema
 */
export async function syncMilestones(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  const result = await db.query(`
    SELECT 
      m.id,
      m.title,
      m.description,
      m."dueDate",
      m.status,
      p.name as "projectName",
      p."organizationId"
    FROM project.milestones m
    JOIN project.projects p ON m."projectId" = p.id
    WHERE p."organizationId" = $1
      AND p."deletedAt" IS NULL
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'project',
    sourceTable: 'milestones',
    sourceId: row.id,
    title: row.title,
    content: row.description || '',
    contentType: 'milestone',
    metadata: {
      status: row.status,
      dueDate: row.dueDate,
      projectName: row.projectName,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync wiki pages from the knowledge schema
 */
export async function syncWikiPages(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  // Note: Wiki pages don't have organizationId directly, 
  // so we might need to sync all or add organization filtering later
  const result = await db.query(`
    SELECT 
      id,
      title,
      content
    FROM knowledge.wiki_pages
  `);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'knowledge',
    sourceTable: 'wiki_pages',
    sourceId: row.id,
    title: row.title,
    content: row.content || '',
    contentType: 'wiki',
    metadata: {},
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync documents from the knowledge schema
 */
export async function syncDocuments(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  const result = await db.query(`
    SELECT 
      d.id,
      d.name,
      d.url,
      d.metadata,
      f.name as "folderName"
    FROM knowledge.documents d
    LEFT JOIN knowledge.document_folders f ON d."folderId" = f.id
    WHERE d."organizationId" = $1
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'knowledge',
    sourceTable: 'documents',
    sourceId: row.id,
    title: row.name,
    content: `Document: ${row.name}\nURL: ${row.url}`,
    contentType: 'document',
    metadata: {
      url: row.url,
      folderName: row.folderName,
      ...row.metadata,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync teams from the workforce schema
 */
export async function syncTeams(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  const result = await db.query(`
    SELECT 
      t.id,
      t.name,
      t.description,
      (
        SELECT COUNT(*) FROM workforce.team_members tm WHERE tm."teamId" = t.id
      ) as "memberCount"
    FROM workforce.teams t
    WHERE t."organizationId" = $1
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'workforce',
    sourceTable: 'teams',
    sourceId: row.id,
    title: row.name,
    content: row.description || '',
    contentType: 'team',
    metadata: {
      memberCount: row.memberCount,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync clients from the client schema
 */
export async function syncClients(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  // Note: Clients might need organization filtering added
  const result = await db.query(`
    SELECT 
      c.id,
      c.name,
      c."contactInfo",
      c."portalAccess"
    FROM client.clients c
  `);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'client',
    sourceTable: 'clients',
    sourceId: row.id,
    title: row.name,
    content: `Client: ${row.name}`,
    contentType: 'client',
    metadata: {
      contactInfo: row.contactInfo,
      portalAccess: row.portalAccess,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync proposals from the client schema
 */
export async function syncProposals(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  
  const result = await db.query(`
    SELECT 
      p.id,
      p.title,
      p.content,
      p.status,
      c.name as "clientName"
    FROM client.proposals p
    JOIN client.clients c ON p."clientId" = c.id
  `);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'client',
    sourceTable: 'proposals',
    sourceId: row.id,
    title: row.title,
    content: row.content || '',
    contentType: 'proposal',
    metadata: {
      status: row.status,
      clientName: row.clientName,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

export interface SyncAllResult {
  projects: { synced: number; errors: string[] };
  tasks: { synced: number; errors: string[] };
  milestones: { synced: number; errors: string[] };
  wikiPages: { synced: number; errors: string[] };
  documents: { synced: number; errors: string[] };
  teams: { synced: number; errors: string[] };
  clients: { synced: number; errors: string[] };
  proposals: { synced: number; errors: string[] };
  totalSynced: number;
  totalErrors: number;
}

/**
 * Sync all data for an organization
 */
export async function syncAllData(organizationId: string): Promise<SyncAllResult> {
  const results = await Promise.all([
    syncProjects(organizationId),
    syncTasks(organizationId),
    syncMilestones(organizationId),
    syncWikiPages(organizationId),
    syncDocuments(organizationId),
    syncTeams(organizationId),
    syncClients(organizationId),
    syncProposals(organizationId),
  ]);

  const [projects, tasks, milestones, wikiPages, documents, teams, clients, proposals] = results;

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return {
    projects,
    tasks,
    milestones,
    wikiPages,
    documents,
    teams,
    clients,
    proposals,
    totalSynced,
    totalErrors,
  };
}

/**
 * Close the database pool
 */
export async function closeSyncPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
