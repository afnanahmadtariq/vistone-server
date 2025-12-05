import { Pool } from 'pg';

// Connection pool for direct database access to other schemas
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
    });
    
    // Handle pool errors gracefully
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

/**
 * User context information for RAG queries
 */
export interface UserContext {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  teamNames: string[];
  assignedTasksCount: number;
  pendingTasksCount: number;
  overdueTasksCount: number;
  projectsCount: number;
  clientsCount: number;
}

/**
 * Fetch comprehensive user context for personalized RAG responses
 */
export async function getUserContext(
  organizationId: string,
  userId: string
): Promise<UserContext | null> {
  const db = getPool();

  try {
    // Get user basic info and role
    const userResult = await db.query(`
      SELECT 
        u.id as "userId",
        u."firstName",
        u."lastName",
        u.email,
        r.name as "roleName"
      FROM auth.users u
      JOIN auth.organization_members om ON u.id = om."userId"
      LEFT JOIN auth.roles r ON om."roleId" = r.id
      WHERE u.id = $1 
        AND om."organizationId" = $2
        AND u."deletedAt" IS NULL
    `, [userId, organizationId]);

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Get user's teams
    const teamsResult = await db.query(`
      SELECT t.name
      FROM workforce.teams t
      JOIN workforce.team_members tm ON t.id = tm."teamId"
      WHERE tm."userId" = $1
        AND t."organizationId" = $2
    `, [userId, organizationId]);

    // Get user's task statistics
    const taskStatsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN t.status IN ('todo', 'pending', 'in_progress') THEN 1 END) as pending,
        COUNT(CASE WHEN t."dueDate" < NOW() AND t.status NOT IN ('completed', 'done') THEN 1 END) as overdue
      FROM project.tasks t
      JOIN project.projects p ON t."projectId" = p.id
      WHERE t."assigneeId" = $1
        AND p."organizationId" = $2
        AND p."deletedAt" IS NULL
    `, [userId, organizationId]);

    // Get user's projects count (where user is a member or manager)
    const projectsResult = await db.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM project.projects p
      LEFT JOIN project.project_members pm ON p.id = pm."projectId"
      WHERE p."organizationId" = $1
        AND p."deletedAt" IS NULL
        AND (p."managerId" = $2 OR pm."userId" = $2)
    `, [organizationId, userId]);

    // Get clients count associated with user's projects
    const clientsResult = await db.query(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM client.clients c
      JOIN client.project_clients pc ON c.id = pc."clientId"
      JOIN project.projects p ON pc."projectId" = p.id
      LEFT JOIN project.project_members pm ON p.id = pm."projectId"
      WHERE p."organizationId" = $1
        AND p."deletedAt" IS NULL
        AND (p."managerId" = $2 OR pm."userId" = $2)
    `, [organizationId, userId]);

    return {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roleName,
      teamNames: teamsResult.rows.map(row => row.name),
      assignedTasksCount: parseInt(taskStatsResult.rows[0]?.total || '0', 10),
      pendingTasksCount: parseInt(taskStatsResult.rows[0]?.pending || '0', 10),
      overdueTasksCount: parseInt(taskStatsResult.rows[0]?.overdue || '0', 10),
      projectsCount: parseInt(projectsResult.rows[0]?.count || '0', 10),
      clientsCount: parseInt(clientsResult.rows[0]?.count || '0', 10),
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Format user context as a readable string for the LLM
 */
export function formatUserContextForPrompt(userContext: UserContext): string {
  const fullName = [userContext.firstName, userContext.lastName]
    .filter(Boolean)
    .join(' ') || 'Unknown User';

  const teamsList = userContext.teamNames.length > 0
    ? userContext.teamNames.join(', ')
    : 'No teams assigned';

  return `
=== CURRENT USER FACTS (VERIFIED DATA) ===
Name: ${fullName}
Email: ${userContext.email}
Role: ${userContext.role || 'No role assigned'}
Teams: ${teamsList}

User's Work Summary:
- Assigned Tasks: ${userContext.assignedTasksCount}
- Pending Tasks: ${userContext.pendingTasksCount}
- Overdue Tasks: ${userContext.overdueTasksCount}
- Projects Involved: ${userContext.projectsCount}
- Clients Associated: ${userContext.clientsCount}
===========================================
`.trim();
}

/**
 * Close the database pool
 */
export async function closeUserContextPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
