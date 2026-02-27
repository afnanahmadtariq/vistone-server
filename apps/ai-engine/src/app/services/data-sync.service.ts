import { Pool } from 'pg';
import { indexDocuments, indexDocument, type DocumentToIndex } from './indexing.service';

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
 * Sync organization overview with comprehensive stats for full org context
 */
export async function syncOrganizationOverview(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();
  const errors: string[] = [];

  try {
    // Get organization details
    const orgResult = await db.query(`
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.settings,
        o."createdAt"
      FROM auth.organizations o
      WHERE o.id = $1
        AND o."deletedAt" IS NULL
    `, [organizationId]);

    if (orgResult.rows.length === 0) {
      return { synced: 0, errors: ['Organization not found'] };
    }

    const org = orgResult.rows[0];

    // Get comprehensive statistics
    const statsQueries = await Promise.all([
      // Member count
      db.query(`
        SELECT COUNT(*) as count 
        FROM auth.organization_members 
        WHERE "organizationId" = $1
      `, [organizationId]),
      
      // Project stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' OR status = 'in_progress' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'on_hold' OR status = 'pending' THEN 1 END) as pending
        FROM project.projects 
        WHERE "organizationId" = $1 AND "deletedAt" IS NULL
      `, [organizationId]),
      
      // Task stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN t.status = 'todo' OR t.status = 'pending' THEN 1 END) as todo,
          COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN t.status = 'completed' OR t.status = 'done' THEN 1 END) as completed,
          COUNT(CASE WHEN t."dueDate" < NOW() AND t.status != 'completed' AND t.status != 'done' THEN 1 END) as overdue
        FROM project.tasks t
        JOIN project.projects p ON t."projectId" = p.id
        WHERE p."organizationId" = $1 AND p."deletedAt" IS NULL
      `, [organizationId]),
      
      // Upcoming deadlines (next 7 days)
      db.query(`
        SELECT 
          t.id,
          t.title,
          t."dueDate",
          t.priority,
          p.name as "projectName"
        FROM project.tasks t
        JOIN project.projects p ON t."projectId" = p.id
        WHERE p."organizationId" = $1 
          AND p."deletedAt" IS NULL
          AND t."dueDate" BETWEEN NOW() AND NOW() + INTERVAL '7 days'
          AND t.status != 'completed' AND t.status != 'done'
        ORDER BY t."dueDate" ASC
        LIMIT 10
      `, [organizationId]),
      
      // Team count
      db.query(`
        SELECT COUNT(*) as count 
        FROM workforce.teams 
        WHERE "organizationId" = $1
      `, [organizationId]),
      
      // Client count
      db.query(`
        SELECT COUNT(*) as count 
        FROM client.clients 
        WHERE "organizationId" = $1
      `, [organizationId]),
      
      // Milestone stats
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN m.status = 'completed' OR m.completed = true THEN 1 END) as completed,
          COUNT(CASE WHEN m."dueDate" < NOW() AND m.status != 'completed' AND m.completed != true THEN 1 END) as overdue
        FROM project.milestones m
        JOIN project.projects p ON m."projectId" = p.id
        WHERE p."organizationId" = $1 AND p."deletedAt" IS NULL
      `, [organizationId]),
    ]);

    const [
      memberStats,
      projectStats,
      taskStats,
      upcomingDeadlines,
      teamStats,
      clientStats,
      milestoneStats,
    ] = statsQueries;

    // Build comprehensive overview content
    const upcomingDeadlinesText = upcomingDeadlines.rows.length > 0
      ? upcomingDeadlines.rows.map(d => 
          `- ${d.title} (${d.projectName}) - Due: ${new Date(d.dueDate).toLocaleDateString()}${d.priority ? ` [${d.priority}]` : ''}`
        ).join('\n')
      : 'No upcoming deadlines in the next 7 days.';

    const overviewContent = `
Organization: ${org.name}
Slug: ${org.slug}
Created: ${new Date(org.createdAt).toLocaleDateString()}

=== ORGANIZATION STATISTICS ===

Team & Workforce:
- Total Members: ${memberStats.rows[0]?.count || 0}
- Teams: ${teamStats.rows[0]?.count || 0}
- Clients: ${clientStats.rows[0]?.count || 0}

Projects Overview:
- Total Projects: ${projectStats.rows[0]?.total || 0}
- Active Projects: ${projectStats.rows[0]?.active || 0}
- Completed Projects: ${projectStats.rows[0]?.completed || 0}
- Pending/On Hold: ${projectStats.rows[0]?.pending || 0}

Tasks Overview:
- Total Tasks: ${taskStats.rows[0]?.total || 0}
- To Do: ${taskStats.rows[0]?.todo || 0}
- In Progress: ${taskStats.rows[0]?.in_progress || 0}
- Completed: ${taskStats.rows[0]?.completed || 0}
- Overdue Tasks: ${taskStats.rows[0]?.overdue || 0}

Milestones:
- Total Milestones: ${milestoneStats.rows[0]?.total || 0}
- Completed: ${milestoneStats.rows[0]?.completed || 0}
- Overdue: ${milestoneStats.rows[0]?.overdue || 0}

=== UPCOMING DEADLINES (Next 7 Days) ===
${upcomingDeadlinesText}
`.trim();

    const doc: DocumentToIndex = {
      organizationId,
      sourceSchema: 'auth',
      sourceTable: 'organizations',
      sourceId: organizationId,
      title: `${org.name} - Organization Overview and Statistics`,
      content: overviewContent,
      contentType: 'organization',
      metadata: {
        name: org.name,
        slug: org.slug,
        // Include all counts in metadata for better searchability
        memberCount: parseInt(memberStats.rows[0]?.count || '0', 10),
        projectCount: parseInt(projectStats.rows[0]?.total || '0', 10),
        activeProjects: parseInt(projectStats.rows[0]?.active || '0', 10),
        completedProjects: parseInt(projectStats.rows[0]?.completed || '0', 10),
        taskCount: parseInt(taskStats.rows[0]?.total || '0', 10),
        todoTasks: parseInt(taskStats.rows[0]?.todo || '0', 10),
        inProgressTasks: parseInt(taskStats.rows[0]?.in_progress || '0', 10),
        completedTasks: parseInt(taskStats.rows[0]?.completed || '0', 10),
        overdueTasks: parseInt(taskStats.rows[0]?.overdue || '0', 10),
        teamCount: parseInt(teamStats.rows[0]?.count || '0', 10),
        clientCount: parseInt(clientStats.rows[0]?.count || '0', 10),
        milestoneCount: parseInt(milestoneStats.rows[0]?.total || '0', 10),
        completedMilestones: parseInt(milestoneStats.rows[0]?.completed || '0', 10),
        overdueMilestones: parseInt(milestoneStats.rows[0]?.overdue || '0', 10),
      },
    };

    const result = await indexDocument(doc);
    return { synced: result.isNew || result.isUpdated ? 1 : 0, errors: [] };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to sync organization overview: ${errorMsg}`);
    return { synced: 0, errors };
  }
}

/**
 * Sync organization members from the auth schema
 */
export async function syncOrganizationMembers(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();

  const result = await db.query(`
    SELECT 
      om.id,
      u.id as "userId",
      u."firstName",
      u."lastName",
      u.email,
      r.name as "roleName",
      om."createdAt" as "joinedAt"
    FROM auth.organization_members om
    JOIN auth.users u ON om."userId" = u.id
    LEFT JOIN auth.roles r ON om."roleId" = r.id
    WHERE om."organizationId" = $1
      AND u."deletedAt" IS NULL
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => {
    const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Unknown';
    return {
      organizationId,
      sourceSchema: 'auth',
      sourceTable: 'organization_members',
      sourceId: row.id,
      title: `Team Member: ${fullName}`,
      content: `Organization member ${fullName} (${row.email})${row.roleName ? ` with role ${row.roleName}` : ''}. Joined on ${new Date(row.joinedAt).toLocaleDateString()}.`,
      contentType: 'member',
      metadata: {
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        role: row.roleName,
        joinedAt: row.joinedAt,
      },
    };
  });

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

/**
 * Sync risk register from the project schema
 */
export async function syncRisks(organizationId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const db = getPool();

  const result = await db.query(`
    SELECT 
      r.id,
      r.description,
      r.probability,
      r.impact,
      r."mitigationPlan",
      r.status,
      p.name as "projectName",
      p.id as "projectId"
    FROM project.risk_register r
    JOIN project.projects p ON r."projectId" = p.id
    WHERE p."organizationId" = $1
      AND p."deletedAt" IS NULL
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'project',
    sourceTable: 'risk_register',
    sourceId: row.id,
    title: `Risk: ${row.description.substring(0, 50)}${row.description.length > 50 ? '...' : ''}`,
    content: `Risk for project ${row.projectName}: ${row.description}${row.mitigationPlan ? `\nMitigation Plan: ${row.mitigationPlan}` : ''}`,
    contentType: 'risk',
    metadata: {
      projectId: row.projectId,
      projectName: row.projectName,
      probability: row.probability,
      impact: row.impact,
      status: row.status,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
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
  
  const result = await db.query(`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.company,
      c.phone,
      c.industry,
      c.status,
      c."contactInfo",
      c."portalAccess"
    FROM client.clients c
    WHERE c."organizationId" = $1
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'client',
    sourceTable: 'clients',
    sourceId: row.id,
    title: `Client: ${row.name}`,
    content: `Client: ${row.name}${row.company ? ` from ${row.company}` : ''}${row.industry ? ` (${row.industry} industry)` : ''}${row.email ? `\nEmail: ${row.email}` : ''}${row.phone ? `\nPhone: ${row.phone}` : ''}`,
    contentType: 'client',
    metadata: {
      email: row.email,
      company: row.company,
      phone: row.phone,
      industry: row.industry,
      status: row.status,
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
      c.name as "clientName",
      c.id as "clientId"
    FROM client.proposals p
    JOIN client.clients c ON p."clientId" = c.id
    WHERE c."organizationId" = $1
  `, [organizationId]);

  const docs: DocumentToIndex[] = result.rows.map(row => ({
    organizationId,
    sourceSchema: 'client',
    sourceTable: 'proposals',
    sourceId: row.id,
    title: `Proposal: ${row.title}`,
    content: `Proposal "${row.title}" for client ${row.clientName}${row.content ? `\n\n${row.content}` : ''}`,
    contentType: 'proposal',
    metadata: {
      status: row.status,
      clientId: row.clientId,
      clientName: row.clientName,
    },
  }));

  const indexResult = await indexDocuments(docs);
  return { synced: indexResult.indexed, errors: indexResult.errors };
}

export interface SyncAllResult {
  organization: { synced: number; errors: string[] };
  members: { synced: number; errors: string[] };
  projects: { synced: number; errors: string[] };
  tasks: { synced: number; errors: string[] };
  milestones: { synced: number; errors: string[] };
  risks: { synced: number; errors: string[] };
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
    syncOrganizationOverview(organizationId),
    syncOrganizationMembers(organizationId),
    syncProjects(organizationId),
    syncTasks(organizationId),
    syncMilestones(organizationId),
    syncRisks(organizationId),
    syncWikiPages(organizationId),
    syncDocuments(organizationId),
    syncTeams(organizationId),
    syncClients(organizationId),
    syncProposals(organizationId),
  ]);

  const [organization, members, projects, tasks, milestones, risks, wikiPages, documents, teams, clients, proposals] = results;

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return {
    organization,
    members,
    projects,
    tasks,
    milestones,
    risks,
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
