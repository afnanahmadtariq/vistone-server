/**
 * AI Engine — Data Sync Service
 * Syncs data from other microservice schemas into the RAG vector store.
 * Uses the shared database pool. LangChain loaded lazily for embeddings.
 *
 * VERIFIED against actual Prisma schemas:
 *   auth:       users (incl. professionalProfile JSON), organizations, organization_members, roles
 *   project:    projects, tasks, milestones, risk_register
 *   workforce:  teams, team_members, user_skills
 *   client:     clients, proposals, project_clients
 *   knowledge:  wiki_pages, documents, document_folders
 */
import { query, getPrisma } from '../db';
import { config } from '../config';
import { embedTexts } from './rag.service';
import crypto from 'crypto';

// ── Types ───────────────────────────────────────────────────────

interface DocumentToIndex {
    organizationId: string;
    sourceSchema: string;
    sourceTable: string;
    sourceId: string;
    title: string;
    content: string;
    contentType: string;
    metadata?: Record<string, unknown>;
}

interface SyncResult {
    synced: number;
    errors: string[];
}

// ── Text Splitting ──────────────────────────────────────────────

function splitText(text: string): string[] {
    const { chunkSize, chunkOverlap } = config.textSplitter;
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start += chunkSize - chunkOverlap;
    }
    return chunks;
}

function contentHash(text: string): string {
    return crypto.createHash('md5').update(text).digest('hex');
}

/** Flatten auth.users.professionalProfile JSON for RAG (skill tags + experiences). */
function professionalProfileToPlainText(
    profile: unknown,
    firstName: string | null,
    lastName: string | null,
    email: string | null
): string {
    let parsed: unknown = profile;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed) as unknown;
        } catch {
            return '';
        }
    }
    if (!parsed || typeof parsed !== 'object') return '';

    const o = parsed as Record<string, unknown>;
    const parts: string[] = [];
    const name = `${firstName || ''} ${lastName || ''}`.trim();
    parts.push(`Contributor: ${name || email || 'Unknown'}${email ? ` (${email})` : ''}.`);

    const tags = o.skillTags;
    const tagNames: string[] = [];
    if (Array.isArray(tags)) {
        for (const t of tags) {
            if (t && typeof t === 'object' && 'name' in t) {
                const n = (t as { name?: unknown }).name;
                if (typeof n === 'string' && n.trim()) tagNames.push(n.trim());
            }
        }
    }
    if (tagNames.length) parts.push(`Skill tags: ${tagNames.join(', ')}.`);

    const ex = o.experiences;
    if (Array.isArray(ex) && ex.length) {
        parts.push('Experience:');
        for (const e of ex) {
            if (!e || typeof e !== 'object') continue;
            const x = e as Record<string, unknown>;
            const bits: string[] = [];
            for (const k of ['jobTitle', 'employer', 'startYear', 'endYear', 'description'] as const) {
                const v = x[k];
                if (v != null && String(v).trim() !== '') bits.push(String(v).trim());
            }
            if (x.isPresent === true) bits.push('present');
            const line = bits.join(' — ');
            if (line) parts.push(`- ${line}`);
        }
    }

    if (tagNames.length === 0 && (!Array.isArray(ex) || ex.length === 0)) return '';

    return parts.join('\n');
}

// ── Index a Single Document ─────────────────────────────────────

async function indexDocument(doc: DocumentToIndex): Promise<boolean> {
    const prisma = await getPrisma();
    const hash = contentHash(doc.content);

    // Check if unchanged
    const existing = await prisma.ragDocument.findUnique({
        where: {
            sourceSchema_sourceTable_sourceId: {
                sourceSchema: doc.sourceSchema,
                sourceTable: doc.sourceTable,
                sourceId: doc.sourceId,
            },
        },
        select: { id: true, contentHash: true },
    });

    if (existing?.contentHash === hash) return false; // Unchanged

    // Split text into chunks
    const chunks = splitText(doc.content);

    // Generate embeddings
    const embeddings = await embedTexts(chunks);

    // Upsert document
    const upserted = await prisma.ragDocument.upsert({
        where: {
            sourceSchema_sourceTable_sourceId: {
                sourceSchema: doc.sourceSchema,
                sourceTable: doc.sourceTable,
                sourceId: doc.sourceId,
            },
        },
        create: {
            organizationId: doc.organizationId,
            sourceSchema: doc.sourceSchema,
            sourceTable: doc.sourceTable,
            sourceId: doc.sourceId,
            title: doc.title,
            content: doc.content,
            contentType: doc.contentType,
            metadata: doc.metadata || {},
            contentHash: hash,
            lastSyncedAt: new Date(),
        },
        update: {
            title: doc.title,
            content: doc.content,
            contentType: doc.contentType,
            metadata: doc.metadata || {},
            contentHash: hash,
            lastSyncedAt: new Date(),
        },
    });

    // Delete old embeddings and insert new ones
    await prisma.ragEmbedding.deleteMany({ where: { documentId: upserted.id } });

    for (let i = 0; i < chunks.length; i++) {
        const vector = `[${embeddings[i].join(',')}]`;
        await query(
            `INSERT INTO ai_engine.rag_embeddings (id, "documentId", "chunkIndex", "chunkText", embedding, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
            [upserted.id, i, chunks[i], vector]
        );
    }

    return true;
}

// ── Sync Functions ──────────────────────────────────────────────

async function syncQuery(
    orgId: string,
    schema: string,
    table: string,
    sql: string,
    contentType: string,
    transform: (row: Record<string, unknown>) => { title: string; content: string; metadata?: Record<string, unknown> }
): Promise<SyncResult> {
    const result: SyncResult = { synced: 0, errors: [] };

    try {
        const res = await query(sql, [orgId]);

        for (const row of res.rows) {
            try {
                const { title, content, metadata } = transform(row);
                if (!content || content.trim().length === 0) continue; // skip empty

                const indexed = await indexDocument({
                    organizationId: orgId,
                    sourceSchema: schema,
                    sourceTable: table,
                    sourceId: row.id as string,
                    title,
                    content,
                    contentType,
                    metadata,
                });
                if (indexed) result.synced++;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                result.errors.push(`${table}/${row.id}: ${message}`);
            }
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`${table}: ${message}`);
    }

    return result;
}

// ── Specific Sync Functions ─────────────────────────────────────

/**
 * project.projects: id, organizationId, name, description, status, progress, budget, startDate, endDate
 */
export async function syncProjects(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'project', 'projects',
        `SELECT id, name, description, status, progress, budget, "startDate", "endDate"
     FROM project.projects WHERE "organizationId" = $1`,
        'project',
        (r) => ({
            title: `Project: ${r.name}`,
            content: `Project "${r.name}" - Status: ${r.status}, Progress: ${r.progress || 0}%${r.description ? `. ${r.description}` : ''}`,
            metadata: { status: r.status, progress: r.progress, budget: r.budget, projectId: r.id },
        })
    );
}

/**
 * project.tasks: id, projectId, title, description, status, priority, dueDate, assigneeId
 */
export async function syncTasks(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'project', 'tasks',
        `SELECT t.id, t.title, t.description, t.status, t.priority, t."dueDate", t."projectId",
            p.name AS "projectName"
     FROM project.tasks t
     LEFT JOIN project.projects p ON p.id = t."projectId"
     WHERE p."organizationId" = $1`,
        'task',
        (r) => ({
            title: `Task: ${r.title}`,
            content: `Task "${r.title}" in project "${r.projectName || 'Unknown'}" - Status: ${r.status}, Priority: ${r.priority}${r.description ? `. ${r.description}` : ''}`,
            metadata: { status: r.status, priority: r.priority, projectId: r.projectId },
        })
    );
}

/**
 * workforce.teams: id, organizationId, name, description, managerId
 */
export async function syncTeams(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'workforce', 'teams',
        `SELECT id, name, description FROM workforce.teams WHERE "organizationId" = $1`,
        'team',
        (r) => ({
            title: `Team: ${r.name}`,
            content: `Team "${r.name}"${r.description ? `: ${r.description}` : ''}`,
        })
    );
}

/**
 * auth.users: id, email, firstName, lastName, status
 * auth.organization_members: organizationId, userId, roleId
 * auth.roles: name
 * Users are linked to orgs via organization_members table.
 */
export async function syncMembers(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'auth', 'users',
        `SELECT u.id, u."firstName", u."lastName", u.email, r.name AS role
     FROM auth.users u
     JOIN auth.organization_members om ON om."userId" = u.id
     LEFT JOIN auth.roles r ON r.id = om."roleId"
     WHERE om."organizationId" = $1`,
        'member',
        (r) => ({
            title: `Member: ${r.firstName || ''} ${r.lastName || ''}`.trim() || (r.email as string),
            content: `${r.firstName || ''} ${r.lastName || ''} (${r.email}) - Role: ${r.role || 'Unknown'}`,
            metadata: { email: r.email, role: r.role },
        })
    );
}

/**
 * auth.users.professionalProfile (JSON) for org members — indexed separately from members rows
 * so RAG can retrieve skill tags and experience text for the AI agent.
 */
export async function syncContributorProfessionalProfiles(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId,
        'auth',
        'user_professional_profiles',
        `SELECT u.id, u."firstName", u."lastName", u.email, u."professionalProfile"
     FROM auth.users u
     INNER JOIN auth.organization_members om ON om."userId" = u.id
     WHERE om."organizationId" = $1 AND u."professionalProfile" IS NOT NULL`,
        'contributor_profile',
        (r) => {
            const content = professionalProfileToPlainText(
                r.professionalProfile,
                r.firstName as string | null,
                r.lastName as string | null,
                r.email as string | null
            );
            return {
                title: `Contributor profile: ${r.firstName || ''} ${r.lastName || ''}`.trim() || (r.email as string),
                content,
                metadata: { userId: r.id, email: r.email },
            };
        }
    );
}

/**
 * workforce.user_skills for users who belong to the organization (for AI / matching).
 */
export async function syncContributorSkills(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId,
        'workforce',
        'user_skills',
        `SELECT us.id, us."userId", us."skillName", us.proficiency,
            u."firstName", u."lastName", u.email
     FROM workforce.user_skills us
     INNER JOIN auth.users u ON u.id = us."userId"
     INNER JOIN auth.organization_members om ON om."userId" = u.id
     WHERE om."organizationId" = $1`,
        'contributor_skill',
        (r) => {
            const who = `${r.firstName || ''} ${r.lastName || ''}`.trim() || (r.email as string);
            const prof =
                typeof r.proficiency === 'number' && !Number.isNaN(r.proficiency)
                    ? `Proficiency: ${r.proficiency}/10.`
                    : '';
            return {
                title: `Skill: ${r.skillName} (${who})`,
                content: `${who} (${r.email}) — Skill: ${r.skillName}. ${prof}`.trim(),
                metadata: { userId: r.userId, skillName: r.skillName, proficiency: r.proficiency },
            };
        }
    );
}

/**
 * client.clients: id, organizationId, name, email, company, industry, status
 */
export async function syncClients(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'client', 'clients',
        `SELECT id, name, email, company, industry, status FROM client.clients WHERE "organizationId" = $1`,
        'client',
        (r) => ({
            title: `Client: ${r.name}`,
            content: `Client "${r.name}"${r.company ? ` from ${r.company}` : ''}${r.industry ? ` (${r.industry})` : ''} - Status: ${r.status}`,
            metadata: { status: r.status, company: r.company },
        })
    );
}

/**
 * project.milestones: id, projectId, title, description, dueDate, status, completed
 * Note: field is "title" not "name"
 */
export async function syncMilestones(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'project', 'milestones',
        `SELECT m.id, m.title, m.description, m.status, m."dueDate", m."projectId",
            p.name AS "projectName"
     FROM project.milestones m
     LEFT JOIN project.projects p ON p.id = m."projectId"
     WHERE p."organizationId" = $1`,
        'milestone',
        (r) => ({
            title: `Milestone: ${r.title}`,
            content: `Milestone "${r.title}" in project "${r.projectName || 'Unknown'}" - Status: ${r.status}${r.description ? `. ${r.description}` : ''}`,
            metadata: { status: r.status, projectId: r.projectId },
        })
    );
}

/**
 * project.risk_register: id, projectId, description, probability, impact, mitigationPlan, status
 * Note: Table is "risk_register", no "title" field — uses description.
 */
export async function syncRisks(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'project', 'risk_register',
        `SELECT r.id, r.description, r.probability, r.impact, r."mitigationPlan", r.status, r."projectId",
            p.name AS "projectName"
     FROM project.risk_register r
     LEFT JOIN project.projects p ON p.id = r."projectId"
     WHERE p."organizationId" = $1`,
        'risk',
        (r) => ({
            title: `Risk in ${r.projectName || 'Unknown'}`,
            content: `Risk in project "${r.projectName || 'Unknown'}" - Probability: ${r.probability || 'N/A'}, Impact: ${r.impact || 'N/A'}, Status: ${r.status}. ${r.description || ''}${r.mitigationPlan ? ` Mitigation: ${r.mitigationPlan}` : ''}`,
            metadata: { probability: r.probability, impact: r.impact, status: r.status, projectId: r.projectId },
        })
    );
}

/**
 * knowledge.wiki_pages: id, title, content, parentId
 * Note: No organizationId column. All wiki pages are global.
 * We sync all wiki pages and match to org via parent context if needed.
 */
export async function syncWikiPages(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId,
        'knowledge',
        'wiki_pages',
        `SELECT wp.id, wp.title, wp.content, wp."wikiId"
     FROM knowledge.wiki_pages wp
     INNER JOIN knowledge.wikis w ON w.id = wp."wikiId"
     WHERE w."organizationId" = $1`,
        'wiki',
        (r) => ({
            title: `Wiki: ${r.title}`,
            content: (r.content as string) || '',
            metadata: { wikiId: r.wikiId },
        })
    );
}

/**
 * knowledge.documents: id, organizationId, folderId, projectId, name, url, version, metadata
 * Note: Has "name" and "url" — no "title" or "content". We index the name + url.
 */
export async function syncDocuments(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'knowledge', 'documents',
        `SELECT id, name, url, version, metadata, "wikiId" FROM knowledge.documents WHERE "organizationId" = $1`,
        'document',
        (r) => ({
            title: `Document: ${r.name}`,
            content: `Document "${r.name}" (v${r.version || 1}) - URL: ${r.url || 'N/A'}`,
            metadata: { url: r.url, version: r.version, wikiId: r.wikiId },
        })
    );
}

/**
 * client.proposals: id, clientId, title, content, status
 * Note: Has "content" not "description". No "amount" field.
 */
export async function syncProposals(orgId: string): Promise<SyncResult> {
    return syncQuery(
        orgId, 'client', 'proposals',
        `SELECT pr.id, pr.title, pr.content, pr.status, pr."clientId",
            c.name AS "clientName"
     FROM client.proposals pr
     LEFT JOIN client.clients c ON c.id = pr."clientId"
     WHERE c."organizationId" = $1`,
        'proposal',
        (r) => ({
            title: `Proposal: ${r.title}`,
            content: `Proposal "${r.title}" for client "${r.clientName || 'Unknown'}" - Status: ${r.status}${r.content ? `. ${r.content}` : ''}`,
            metadata: { status: r.status, clientId: r.clientId },
        })
    );
}

// ── Sync All ────────────────────────────────────────────────────

export async function syncAllData(orgId: string) {
    const fns = [
        syncProjects, syncTasks, syncTeams, syncMembers,
        syncContributorProfessionalProfiles, syncContributorSkills,
        syncClients, syncMilestones, syncRisks,
        syncWikiPages, syncDocuments, syncProposals,
    ];

    let totalSynced = 0;
    const allErrors: string[] = [];

    // Run sequentially to avoid memory spikes
    for (const fn of fns) {
        const result = await fn(orgId);
        totalSynced += result.synced;
        allErrors.push(...result.errors);
    }

    return { totalSynced, totalErrors: allErrors.length, errors: allErrors };
}

// ── Stats ───────────────────────────────────────────────────────

export async function getIndexingStats(orgId: string) {
    const prisma = await getPrisma();
    const total = await prisma.ragDocument.count({
        where: { organizationId: orgId },
    });

    const byType = await prisma.ragDocument.groupBy({
        by: ['contentType'],
        where: { organizationId: orgId },
        _count: { id: true },
    });

    return {
        totalDocuments: total,
        byContentType: Object.fromEntries(
            byType.map((b: { contentType: string; _count: { id: number } }) => [b.contentType, b._count.id])
        ),
    };
}

// ── Remove a Document ───────────────────────────────────────────

export async function removeDocument(sourceSchema: string, sourceTable: string, sourceId: string): Promise<boolean> {
    const prisma = await getPrisma();
    try {
        await prisma.ragDocument.delete({
            where: {
                sourceSchema_sourceTable_sourceId: {
                    sourceSchema,
                    sourceTable,
                    sourceId,
                },
            },
        });
        return true;
    } catch {
        return false; // Not found or already deleted
    }
}

// Re-export for route use
export { indexDocument, type DocumentToIndex };
