/**
 * AI Engine — RBAC Service
 * Enforces permission checks for RAG content filtering and agent tool access.
 * Uses the user's actual DB permissions (loaded by auth plugin via auth-service).
 */
import type { AuthenticatedUser, ContentType, UserPermissions } from '../types';
import { CONTENT_TYPE_TO_RESOURCE, TOOL_PERMISSIONS } from '../types';

// ── Permission Checks ───────────────────────────────────────────

/**
 * Check if user has a specific resource:action permission.
 * Organizers always have full access (safety net).
 */
export function hasPermission(
    user: AuthenticatedUser,
    resource: string,
    action: string
): boolean {
    // Organizers bypass all checks
    if (user.role?.toLowerCase() === 'organizer') return true;

    if (!user.permissions) return false;

    const resourcePerms = user.permissions[resource];
    if (!resourcePerms || !Array.isArray(resourcePerms)) return false;

    return resourcePerms.includes(action) || resourcePerms.includes('*');
}

// ── RAG Content Filtering ───────────────────────────────────────

/**
 * Returns only the content types this user is allowed to read.
 * Used to filter vector search results before they reach the LLM.
 */
export function getReadableContentTypes(user: AuthenticatedUser): ContentType[] {
    const allTypes = Object.keys(CONTENT_TYPE_TO_RESOURCE) as ContentType[];

    // Organizers see everything
    if (user.role?.toLowerCase() === 'organizer') return allTypes;

    return allTypes.filter((ct) => {
        const mapping = CONTENT_TYPE_TO_RESOURCE[ct];
        return hasPermission(user, mapping.resource, mapping.action);
    });
}

/**
 * Build the content type filter clause for SQL queries.
 * Returns a WHERE condition fragment like: content_type IN ('project', 'task')
 */
export function buildContentTypeFilter(user: AuthenticatedUser): {
    clause: string;
    types: ContentType[];
} {
    const types = getReadableContentTypes(user);
    if (types.length === 0) {
        return { clause: 'FALSE', types: [] };
    }
    const placeholders = types.map((_, i) => `$${i + 1}`).join(', ');
    return {
        clause: `content_type IN (${placeholders})`,
        types,
    };
}

// ── Agent Tool Filtering ────────────────────────────────────────

/**
 * Check if user has permission to use a specific agent tool.
 */
export function canUseTool(user: AuthenticatedUser, toolName: string): boolean {
    const mapping = TOOL_PERMISSIONS[toolName];
    if (!mapping) return false; // Unknown tool → deny
    return hasPermission(user, mapping.resource, mapping.action);
}

/**
 * Filter tool list to only those the user has permission for.
 * Used when binding tools to the LLM.
 */
export function filterToolsByPermission<T extends { name: string }>(
    user: AuthenticatedUser,
    tools: T[]
): T[] {
    return tools.filter((tool) => canUseTool(user, tool.name));
}

/**
 * Get a human-readable summary of what the user can do.
 * Used in the system prompt to help the LLM understand boundaries.
 */
export function describePermissions(user: AuthenticatedUser): string {
    const perms = user.permissions;
    if (!perms) return 'You have no specific permissions loaded.';

    const lines: string[] = [];

    for (const [resource, actions] of Object.entries(perms)) {
        if (resource === '_meta' || !Array.isArray(actions) || actions.length === 0) continue;
        lines.push(`- ${resource}: ${actions.join(', ')}`);
    }

    if (lines.length === 0) return 'The user has minimal permissions.';

    return `User permissions:\n${lines.join('\n')}`;
}
