/**
 * AI Engine — Agent Tools (Lazy + RBAC-aware)
 * All tools defined in one file. Only loaded when agent mode is triggered.
 * Tool definitions are created lazily via getTools().
 *
 * ROUTE MAPPING (verified against each microservice):
 *   Project Mgmt  (3003): /projects, /tasks, /milestones, /risk-register, /project-members
 *   Client Mgmt   (3004): /clients, /proposals, /project-clients, /client-feedback
 *   Workforce     (3002): /teams, /team-members, /user-skills, /user-availability
 *   Communication (3006): /chat-channels, /chat-messages, /channel-members, /message-mentions
 *   Notification   (3008): /notifications, /notifications/user/:userId
 *   Knowledge Hub (3005): /documents, /wiki-pages, /document-folders
 */
import { z } from 'zod';
import type { AuthenticatedUser } from '../types';
import {
    projectClient, clientClient, workforceClient,
    communicationClient, notificationClient, knowledgeClient,
    safeCall,
} from '../services/connectors';

// ── Tool Definition Type ────────────────────────────────────────

export interface ToolDef {
    name: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema: z.ZodObject<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    func: (input: any) => Promise<string>;
}

/**
 * Build tools scoped to the authenticated user. Organization IDs are injected server-side — the model must not supply them.
 */
export function buildToolDefs(user: AuthenticatedUser): ToolDef[] {
    const orgId = user.organizationId.trim();
    const noOrg = (): string =>
        JSON.stringify({ success: false, error: 'No organization in session. Select a workspace in the app.' });

    return [
        // ═══════════════════════════════════════════════════════════
        // Project Management Service (port 3003)
        // Routes: /projects, /tasks, /milestones, /risk-register
        // ═══════════════════════════════════════════════════════════
        {
            name: 'create_project',
            description: 'Create a new project in the user\'s current organization.',
            schema: z.object({
                name: z.string().describe('Project name'),
                description: z.string().optional().describe('Project description'),
                status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional().default('planned'),
                startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
                endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
                budget: z.number().optional(),
                managerId: z.string().optional(),
                clientId: z.string().optional(),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const r = await safeCall(() =>
                    projectClient().post('/projects', { ...input, organizationId: orgId })
                );
                return JSON.stringify(r);
            },
        },
        {
            name: 'get_project',
            description: 'Get project details by ID.',
            schema: z.object({ projectId: z.string() }),
            func: async ({ projectId }) => {
                const r = await safeCall(() => projectClient().get(`/projects/${projectId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'update_project',
            description: 'Update an existing project.',
            schema: z.object({
                projectId: z.string(),
                name: z.string().optional(),
                description: z.string().optional(),
                status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                budget: z.number().optional(),
                progress: z.number().min(0).max(100).optional(),
                managerId: z.string().optional(),
            }),
            func: async ({ projectId, ...updates }) => {
                const r = await safeCall(() => projectClient().put(`/projects/${projectId}`, updates));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_projects',
            description: 'List projects in the user\'s current organization.',
            schema: z.object({
                status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
                search: z.string().optional(),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const params = new URLSearchParams();
                params.set('organizationId', orgId);
                if (input.status) params.set('status', input.status);
                if (input.search) params.set('search', input.search);
                const r = await safeCall(() => projectClient().get(`/projects?${params}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'create_task',
            description: 'Create a new task within a project.',
            schema: z.object({
                projectId: z.string(),
                title: z.string(),
                description: z.string().optional(),
                status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional().default('todo'),
                priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
                dueDate: z.string().optional(),
                assigneeId: z.string().optional(),
                estimatedHours: z.number().optional(),
            }),
            func: async (input) => {
                // POST /tasks
                const r = await safeCall(() => projectClient().post('/tasks', input));
                return JSON.stringify(r);
            },
        },
        {
            name: 'get_task',
            description: 'Get task details by ID.',
            schema: z.object({ taskId: z.string() }),
            func: async ({ taskId }) => {
                // GET /tasks/:id
                const r = await safeCall(() => projectClient().get(`/tasks/${taskId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'update_task',
            description: 'Update an existing task.',
            schema: z.object({
                taskId: z.string(),
                title: z.string().optional(),
                description: z.string().optional(),
                status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional(),
                priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
                dueDate: z.string().optional(),
                assigneeId: z.string().optional(),
                estimatedHours: z.number().optional(),
                actualHours: z.number().optional(),
            }),
            func: async ({ taskId, ...updates }) => {
                // PUT /tasks/:id
                const r = await safeCall(() => projectClient().put(`/tasks/${taskId}`, updates));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_tasks',
            description: 'List tasks. Can filter by project, assignee, or status.',
            schema: z.object({
                projectId: z.string().optional(),
                assigneeId: z.string().optional(),
                status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional(),
            }),
            func: async (input) => {
                const params = new URLSearchParams();
                if (input.projectId) params.set('projectId', input.projectId);
                if (input.assigneeId) params.set('assigneeId', input.assigneeId);
                if (input.status) params.set('status', input.status);
                // GET /tasks?...
                const r = await safeCall(() => projectClient().get(`/tasks?${params}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'create_milestone',
            description: 'Create a milestone for a project.',
            schema: z.object({
                projectId: z.string(),
                title: z.string().describe('Milestone title'),
                description: z.string().optional(),
                dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
                status: z.enum(['pending', 'in_progress', 'completed', 'missed']).optional().default('pending'),
            }),
            func: async (input) => {
                // POST /milestones
                const r = await safeCall(() => projectClient().post('/milestones', input));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_milestones',
            description: 'List milestones for a project.',
            schema: z.object({ projectId: z.string() }),
            func: async ({ projectId }) => {
                // GET /milestones?projectId=...
                const r = await safeCall(() => projectClient().get(`/milestones?projectId=${projectId}`));
                return JSON.stringify(r);
            },
        },

        // ═══════════════════════════════════════════════════════════
        // Client Management Service (port 3004)
        // Routes: /clients, /proposals
        // ═══════════════════════════════════════════════════════════
        {
            name: 'create_client',
            description: 'Create a new client in the user\'s current organization.',
            schema: z.object({
                name: z.string(),
                email: z.string().optional(),
                phone: z.string().optional(),
                company: z.string().optional(),
                industry: z.string().optional(),
                address: z.string().optional(),
                status: z.enum(['active', 'inactive', 'prospect', 'churned']).optional().default('active'),
                portalAccess: z.boolean().optional(),
                contactPersonId: z.string().optional(),
                contactInfo: z.any().optional().describe('Additional contact info (JSON)'),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const r = await safeCall(() => clientClient().post('/clients', { ...input, organizationId: orgId }));
                return JSON.stringify(r);
            },
        },
        {
            name: 'get_client',
            description: 'Get client details by ID.',
            schema: z.object({ clientId: z.string() }),
            func: async ({ clientId }) => {
                // GET /clients/:id
                const r = await safeCall(() => clientClient().get(`/clients/${clientId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'update_client',
            description: 'Update an existing client record.',
            schema: z.object({
                clientId: z.string(),
                name: z.string().optional(),
                email: z.string().optional(),
                phone: z.string().optional(),
                company: z.string().optional(),
                industry: z.string().optional(),
                address: z.string().optional(),
                status: z.enum(['active', 'inactive', 'prospect', 'churned']).optional(),
                portalAccess: z.boolean().optional(),
                contactPersonId: z.string().optional(),
                contactInfo: z.any().optional().describe('Additional contact info (JSON)'),
            }),
            func: async ({ clientId, ...updates }) => {
                // PUT /clients/:id
                const r = await safeCall(() => clientClient().put(`/clients/${clientId}`, updates));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_clients',
            description: 'List clients in the user\'s current organization.',
            schema: z.object({
                status: z.enum(['active', 'inactive', 'prospect', 'churned']).optional(),
                search: z.string().optional(),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const params = new URLSearchParams();
                params.set('organizationId', orgId);
                if (input.status) params.set('status', input.status);
                if (input.search) params.set('search', input.search);
                const r = await safeCall(() => clientClient().get(`/clients?${params}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'create_proposal',
            description: 'Create a proposal for a client.',
            schema: z.object({
                clientId: z.string(),
                title: z.string(),
                content: z.string().optional().describe('Proposal body/content'),
                status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional().default('draft'),
            }),
            func: async (input) => {
                // POST /proposals
                const r = await safeCall(() => clientClient().post('/proposals', input));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_proposals',
            description: 'List proposals in the user\'s organization, optionally filtered by client or status.',
            schema: z.object({
                clientId: z.string().optional(),
                status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const params = new URLSearchParams();
                params.set('organizationId', orgId);
                if (input.clientId) params.set('clientId', input.clientId);
                if (input.status) params.set('status', input.status);
                const r = await safeCall(() => clientClient().get(`/proposals?${params}`));
                return JSON.stringify(r);
            },
        },

        // ═══════════════════════════════════════════════════════════
        // Workforce Management Service (port 3002)
        // Routes: /teams, /team-members, /user-skills
        // ═══════════════════════════════════════════════════════════
        {
            name: 'create_team',
            description: 'Create a new team in the user\'s current organization.',
            schema: z.object({
                name: z.string(),
                description: z.string().optional(),
                managerId: z.string().optional().describe('User ID of the team manager'),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const r = await safeCall(() => workforceClient().post('/teams', { ...input, organizationId: orgId }));
                return JSON.stringify(r);
            },
        },
        {
            name: 'get_team',
            description: 'Get team details.',
            schema: z.object({ teamId: z.string() }),
            func: async ({ teamId }) => {
                // GET /teams/:id
                const r = await safeCall(() => workforceClient().get(`/teams/${teamId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_teams',
            description: 'List teams in the user\'s current organization.',
            schema: z.object({
                search: z.string().optional(),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const params = new URLSearchParams();
                params.set('organizationId', orgId);
                if (input.search) params.set('search', input.search);
                const r = await safeCall(() => workforceClient().get(`/teams?${params}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'add_team_member',
            description: 'Add a user to a team.',
            schema: z.object({
                teamId: z.string(),
                userId: z.string(),
                role: z.string().optional(),
            }),
            func: async (input) => {
                // POST /team-members  (separate module, not nested under /teams)
                const r = await safeCall(() => workforceClient().post('/team-members', input));
                return JSON.stringify(r);
            },
        },
        {
            name: 'get_team_members',
            description: 'Get all members of a team.',
            schema: z.object({ teamId: z.string() }),
            func: async ({ teamId }) => {
                // GET /team-members?teamId=...
                const r = await safeCall(() => workforceClient().get(`/team-members?teamId=${teamId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'get_user_skills',
            description: 'Get skills of a user.',
            schema: z.object({ userId: z.string() }),
            func: async ({ userId }) => {
                // GET /user-skills?userId=...
                const r = await safeCall(() => workforceClient().get(`/user-skills?userId=${userId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'add_user_skill',
            description: 'Add a skill to a user.',
            schema: z.object({
                userId: z.string(),
                skillName: z.string(),
                proficiency: z.number().int().min(1).max(10).optional().describe('Proficiency level from 1 to 10'),
            }),
            func: async (input) => {
                // POST /user-skills
                const r = await safeCall(() => workforceClient().post('/user-skills', input));
                return JSON.stringify(r);
            },
        },

        // ═══════════════════════════════════════════════════════════
        // Communication Service (port 3006)
        // Routes: /chat-channels, /chat-messages, /channel-members
        // ═══════════════════════════════════════════════════════════
        {
            name: 'send_message',
            description: 'Send a message to a channel.',
            schema: z.object({
                channelId: z.string(),
                senderId: z.string(),
                content: z.string(),
                type: z.enum(['text', 'file', 'image', 'system']).optional().default('text').describe('Message type'),
            }),
            func: async (input) => {
                // POST /chat-messages
                const r = await safeCall(() => communicationClient().post('/chat-messages', input));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_messages',
            description: 'Get messages from a channel.',
            schema: z.object({
                channelId: z.string(),
                limit: z.number().optional().default(50),
            }),
            func: async ({ channelId, limit }) => {
                // GET /chat-messages?channelId=...&limit=...
                const r = await safeCall(() =>
                    communicationClient().get(`/chat-messages?channelId=${channelId}&limit=${limit}`)
                );
                return JSON.stringify(r);
            },
        },
        {
            name: 'create_channel',
            description: 'Create a communication channel in the user\'s current organization.',
            schema: z.object({
                name: z.string(),
                description: z.string().optional(),
                type: z.enum(['project', 'group', 'dm']).optional().default('group').describe('Channel type'),
                projectId: z.string().optional().describe('Project ID (required when type is "project")'),
                createdBy: z.string().describe('User ID of the channel creator'),
                memberIds: z.array(z.string()).optional().default([]).describe('User IDs to add as members'),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const r = await safeCall(() =>
                    communicationClient().post('/chat-channels', { ...input, organizationId: orgId })
                );
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_channels',
            description: 'List communication channels for the user\'s current organization.',
            schema: z.object({
                userId: z.string().optional(),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const params = new URLSearchParams();
                params.set('organizationId', orgId);
                if (input.userId) params.set('userId', input.userId);
                const r = await safeCall(() => communicationClient().get(`/chat-channels?${params}`));
                return JSON.stringify(r);
            },
        },

        // ═══════════════════════════════════════════════════════════
        // Notification Service (port 3008)
        // Routes: /notifications, /notifications/user/:userId
        // ═══════════════════════════════════════════════════════════
        {
            name: 'send_notification',
            description: 'Send a notification to a user.',
            schema: z.object({
                userId: z.string(),
                content: z.string().describe('Notification message content'),
                type: z.enum(['info', 'success', 'warning', 'error', 'task', 'mention', 'reminder']).optional(),
            }),
            func: async (input) => {
                // POST /notifications
                const r = await safeCall(() => notificationClient().post('/notifications', input));
                return JSON.stringify(r);
            },
        },
        {
            name: 'list_notifications',
            description: 'List notifications for a user.',
            schema: z.object({
                userId: z.string(),
                unreadOnly: z.boolean().optional().default(false),
            }),
            func: async ({ userId }) => {
                // GET /notifications/user/:userId
                const r = await safeCall(() => notificationClient().get(`/notifications/user/${userId}`));
                return JSON.stringify(r);
            },
        },
        {
            name: 'mark_notification_read',
            description: 'Mark a notification as read.',
            schema: z.object({ notificationId: z.string() }),
            func: async ({ notificationId }) => {
                // PUT /notifications/:id
                const r = await safeCall(() =>
                    notificationClient().put(`/notifications/${notificationId}`, { isRead: true })
                );
                return JSON.stringify(r);
            },
        },
        {
            name: 'mark_all_notifications_read',
            description: 'Mark all notifications as read for a user.',
            schema: z.object({ userId: z.string() }),
            func: async ({ userId }) => {
                // PUT /notifications/user/:userId/read-all
                const r = await safeCall(() =>
                    notificationClient().put(`/notifications/user/${userId}/read-all`, {})
                );
                return JSON.stringify(r);
            },
        },

        // ═══════════════════════════════════════════════════════════
        // Knowledge Hub Service (port 3005)
        // Routes: /documents, /wiki-pages, /document-folders
        // ═══════════════════════════════════════════════════════════
        {
            name: 'create_document',
            description: 'Create a document (file reference) in a wiki. Requires a wikiId, document name, and a URL pointing to the file.',
            schema: z.object({
                wikiId: z.string().describe('ID of the wiki this document belongs to'),
                name: z.string().describe('Document name'),
                url: z.string().describe('URL of the document file'),
                folderId: z.string().optional().describe('Folder ID within the wiki'),
                metadata: z.any().optional().describe('Additional metadata (JSON)'),
            }),
            func: async (input) => {
                if (!orgId) return noOrg();
                const r = await safeCall(() =>
                    knowledgeClient().post('/documents', { ...input, organizationId: orgId })
                );
                return JSON.stringify(r);
            },
        },
        {
            name: 'search_documents',
            description:
                'List documents in the knowledge hub for this organization. If wikiId is omitted, lists documents across all wikis in the org.',
            schema: z.object({
                wikiId: z.string().optional().describe('Limit to one wiki; omit to include every wiki in the org.'),
            }),
            func: async ({ wikiId }) => {
                if (!orgId) return noOrg();
                if (wikiId) {
                    const r = await safeCall(() =>
                        knowledgeClient().get(`/documents?wikiId=${encodeURIComponent(wikiId)}`)
                    );
                    return JSON.stringify(r);
                }
                const wikisR = await safeCall(() =>
                    knowledgeClient().get(`/wikis?organizationId=${encodeURIComponent(orgId)}`)
                );
                if (!wikisR.success) return JSON.stringify(wikisR);
                const wikis = wikisR.data as { id: string }[];
                if (!Array.isArray(wikis) || wikis.length === 0) {
                    return JSON.stringify({ success: true, data: [] });
                }
                const all: unknown[] = [];
                for (const w of wikis) {
                    const dr = await safeCall(() =>
                        knowledgeClient().get(`/documents?wikiId=${encodeURIComponent(w.id)}`)
                    );
                    if (dr.success && Array.isArray(dr.data)) {
                        all.push(...dr.data);
                    }
                }
                return JSON.stringify({ success: true, data: all });
            },
        },
        {
            name: 'create_wiki_page',
            description: 'Create a wiki page.',
            schema: z.object({
                wikiId: z.string().describe('ID of the wiki this page belongs to'),
                title: z.string(),
                content: z.string().optional(),
                parentId: z.string().optional().describe('Parent page ID for nesting'),
            }),
            func: async (input) => {
                // POST /wiki-pages
                const r = await safeCall(() => knowledgeClient().post('/wiki-pages', input));
                return JSON.stringify(r);
            },
        },
    ];
}
