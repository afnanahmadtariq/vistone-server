/**
 * AI Engine — Shared Type Definitions
 */

// ── User & Auth ─────────────────────────────────────────────────

export interface UserPermissions {
    [resource: string]: string[];
}

export interface AuthenticatedUser {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
    status: string;
    organizationId: string;
    organizationName?: string;
    permissions: UserPermissions | null;
}

// ── Chat ────────────────────────────────────────────────────────

export type ContentType =
    | 'organization'
    | 'project'
    | 'task'
    | 'milestone'
    | 'risk'
    | 'wiki'
    | 'document'
    | 'team'
    | 'member'
    | 'client'
    | 'proposal';

export interface ChatRequest {
    query: string;
    sessionId?: string;
}

export interface ChatResponse {
    answer: string;
    sessionId: string;
    sources: SourceReference[];
    isOutOfScope?: boolean;
    isActionResponse?: boolean;
    actionResult?: ActionResult;
}

export interface SourceReference {
    contentType: string;
    title: string;
    sourceId: string;
}

export interface ActionResult {
    success: boolean;
    toolsUsed: string[];
    iterations: number;
}

// ── RBAC Mapping ────────────────────────────────────────────────
// Maps RAG content types → RBAC resource + action

export const CONTENT_TYPE_TO_RESOURCE: Record<ContentType, { resource: string; action: string }> = {
    organization: { resource: 'settings', action: 'read' },
    project: { resource: 'projects', action: 'read' },
    task: { resource: 'tasks', action: 'read' },
    milestone: { resource: 'projects', action: 'read' },
    risk: { resource: 'projects', action: 'read' },
    wiki: { resource: 'wiki', action: 'read' },
    document: { resource: 'wiki', action: 'read' },
    team: { resource: 'teams', action: 'read' },
    member: { resource: 'users', action: 'read' },
    client: { resource: 'clients', action: 'read' },
    proposal: { resource: 'clients', action: 'read' },
};

// Maps agent tools → required RBAC resource + action
export const TOOL_PERMISSIONS: Record<string, { resource: string; action: string }> = {
    // Project Management
    create_project: { resource: 'projects', action: 'create' },
    get_project: { resource: 'projects', action: 'read' },
    update_project: { resource: 'projects', action: 'update' },
    list_projects: { resource: 'projects', action: 'read' },
    create_task: { resource: 'tasks', action: 'create' },
    get_task: { resource: 'tasks', action: 'read' },
    update_task: { resource: 'tasks', action: 'update' },
    list_tasks: { resource: 'tasks', action: 'read' },
    create_milestone: { resource: 'projects', action: 'update' },
    list_milestones: { resource: 'projects', action: 'read' },
    // Client Management
    create_client: { resource: 'clients', action: 'create' },
    get_client: { resource: 'clients', action: 'read' },
    update_client: { resource: 'clients', action: 'update' },
    list_clients: { resource: 'clients', action: 'read' },
    create_proposal: { resource: 'clients', action: 'create' },
    list_proposals: { resource: 'clients', action: 'read' },
    // Workforce
    create_team: { resource: 'teams', action: 'create' },
    get_team: { resource: 'teams', action: 'read' },
    list_teams: { resource: 'teams', action: 'read' },
    add_team_member: { resource: 'teams', action: 'update' },
    get_team_members: { resource: 'teams', action: 'read' },
    get_user_skills: { resource: 'users', action: 'read' },
    add_user_skill: { resource: 'users', action: 'update' },
    // Communication
    send_message: { resource: 'channels', action: 'update' },
    list_messages: { resource: 'channels', action: 'read' },
    create_channel: { resource: 'channels', action: 'create' },
    list_channels: { resource: 'channels', action: 'read' },
    // Notification
    send_notification: { resource: 'notifications', action: 'create' },
    list_notifications: { resource: 'notifications', action: 'read' },
    mark_notification_read: { resource: 'notifications', action: 'update' },
    mark_all_notifications_read: { resource: 'notifications', action: 'update' },
    // Knowledge Hub
    create_document: { resource: 'wiki', action: 'create' },
    search_documents: { resource: 'wiki', action: 'read' },
    create_wiki_page: { resource: 'wiki', action: 'create' },
};

// ── Errors ──────────────────────────────────────────────────────

export class AIEngineError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode = 500
    ) {
        super(message);
        this.name = 'AIEngineError';
    }
}

export class ForbiddenError extends AIEngineError {
    constructor(message = 'Insufficient permissions') {
        super(message, 'FORBIDDEN', 403);
        this.name = 'ForbiddenError';
    }
}
