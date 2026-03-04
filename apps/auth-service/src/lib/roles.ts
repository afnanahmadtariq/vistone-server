/**
 * Role Definitions for Vistone
 *
 * This file defines the 4 user roles:
 * - 3 Internal roles: Organizer, Manager, Contributor
 * - 1 External role: Client
 *
 * Permission Customization Rules:
 * - Organizer can revoke/grant any permission for Manager (granting all = promotion to Organizer)
 * - Manager can revoke/reinstate permissions for Contributor (only if granted 'manage_permissions' by Organizer)
 * - Contributor can only have permissions revoked and reinstated (never beyond default), for more must be promoted to Manager by Organizer
 * - Organizer can pause any user
 * - Manager can pause Contributors (only if granted 'pause_contributors' meta-permission by Organizer)
 */

// Role name constants
export const ROLE_NAMES = {
    ORGANIZER: 'Organizer',
    MANAGER: 'Manager',
    CONTRIBUTOR: 'Contributor',
    CLIENT: 'Client',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

// Role types
export const ROLE_TYPES = {
    INTERNAL: 'internal',
    EXTERNAL: 'external',
} as const;

export type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES];

// Permission action types
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'assign';

// Resource types that can be accessed
export type ResourceType =
    | 'users'
    | 'teams'
    | 'projects'
    | 'tasks'
    | 'clients'
    | 'wiki'
    | 'channels'
    | 'settings'
    | 'reports'
    | 'notifications';

/**
 * Meta-permissions control delegation and special abilities.
 * These are stored alongside resource permissions in the permissions JSON
 * under a special '_meta' key.
 *
 * - manage_permissions: Allows a Manager to revoke/reinstate permissions for Contributors in their team
 * - pause_contributors: Allows a Manager to pause Contributors (security feature)
 */
export type MetaPermission = 'manage_permissions' | 'pause_contributors';

// Permission definition structure — uses string[] because the JSON stores heterogeneous permission names
export interface RolePermissions {
    [resource: string]: string[];
}

// Role definition structure
export interface RoleDefinition {
    name: RoleName;
    type: RoleType;
    description: string;
    isSystem: boolean;
    permissions: RolePermissions;
}

/**
 * Organizer Role — DEFAULT permissions
 * - Full system access and control
 * - Creates Projects, Teams, and assigns Managers to Teams
 * - Can customize granular permissions for any Manager, Team, or Contributor
 * - Assigns tasks to Teams or directly to Contributors
 * - Can pause any user
 */
export const ORGANIZER_PERMISSIONS: RolePermissions = {
    users: ['create', 'read', 'update', 'delete', 'assign'],
    teams: ['create', 'read', 'update', 'delete', 'assign'],
    projects: ['create', 'read', 'update', 'delete', 'assign'],
    tasks: ['create', 'read', 'update', 'delete', 'assign'],
    clients: ['create', 'read', 'update', 'delete'],
    wiki: ['create', 'read', 'update', 'delete'],
    channels: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update'],
    reports: ['create', 'read', 'update', 'delete'],
    notifications: ['create', 'read', 'update', 'delete'],
    // Organizer meta-permissions are implicit — they can do everything.
    // Listing them here for completeness and so the schema is self-documenting.
    _meta: ['manage_permissions', 'pause_contributors'],
};

/**
 * Manager Role — DEFAULT permissions
 * - Assigned to one or more Teams by the Organizer
 * - Manages Contributors within their assigned Teams
 * - Receives tasks assigned to their Team(s)
 * - Delegates these tasks to specific Contributors within the Team
 * - Can view/edit tasks within their Teams (scope defined by Organizer)
 *
 * NOTE: `manage_permissions` and `pause_contributors` are NOT granted by default.
 * The Organizer must explicitly grant these meta-permissions to a Manager.
 * Organizer can grant permissions BEYOND these defaults (granting all = promotion).
 */
export const MANAGER_PERMISSIONS: RolePermissions = {
    users: ['read'],
    teams: ['read', 'update'], // Can update their assigned teams
    projects: ['read', 'update'], // Can view/update projects they're assigned to
    tasks: ['create', 'read', 'update', 'assign'], // Can create, view, update, and assign tasks to contributors
    clients: ['read'], // Can view clients related to their projects
    wiki: ['create', 'read', 'update'],
    channels: ['create', 'read', 'update'],
    settings: ['read'],
    reports: ['read'],
    notifications: ['read', 'update'],
    _meta: [], // No meta-permissions by default — must be granted by Organizer
};

/**
 * Contributor Role — DEFAULT (and MAXIMUM) permissions
 * - Member of one or more Teams
 * - Receives tasks assigned by their Manager
 * - Views only tasks assigned to them
 * - Limited project visibility (only projects they're assigned to)
 *
 * NOTE: Contributors can only have permissions REVOKED and REINSTATED.
 * They can NEVER be given more than these defaults.
 * For more permissions, they must be promoted to Manager by the Organizer.
 */
export const CONTRIBUTOR_PERMISSIONS: RolePermissions = {
    users: ['read'], // Can view other team members
    teams: ['read'], // Can view their team info
    projects: ['read'], // Can view projects they're assigned to
    tasks: ['read', 'update'], // Can view and update status of their assigned tasks
    clients: [], // No client access
    wiki: ['read'],
    channels: ['read', 'update'], // Can read and send messages
    settings: [],
    reports: ['read'], // Can view reports related to them
    notifications: ['read', 'update'],
    _meta: [], // Contributors never get meta-permissions
};

/**
 * Client Role (External) — DEFAULT permissions
 * - External portal access only
 * - Read-only view of specific projects
 */
export const CLIENT_PERMISSIONS: RolePermissions = {
    users: [],
    teams: [],
    projects: ['read'], // Read-only view of their projects
    tasks: ['read'], // Read-only view of tasks related to their projects
    clients: [],
    wiki: [],
    channels: ['read', 'update'], // Can participate in their project channels
    settings: [],
    reports: ['read'], // Can view project reports
    notifications: ['read'],
    _meta: [],
};

// Complete role definitions
export const ROLE_DEFINITIONS: Record<RoleName, RoleDefinition> = {
    [ROLE_NAMES.ORGANIZER]: {
        name: ROLE_NAMES.ORGANIZER,
        type: ROLE_TYPES.INTERNAL,
        description:
            'Full system access. Creates projects, teams, and assigns managers. Can customize permissions. Can pause any user.',
        isSystem: true,
        permissions: ORGANIZER_PERMISSIONS,
    },
    [ROLE_NAMES.MANAGER]: {
        name: ROLE_NAMES.MANAGER,
        type: ROLE_TYPES.INTERNAL,
        description:
            'Manages teams and contributors. Receives and delegates tasks within assigned teams. Can be granted manage_permissions and pause_contributors by Organizer.',
        isSystem: true,
        permissions: MANAGER_PERMISSIONS,
    },
    [ROLE_NAMES.CONTRIBUTOR]: {
        name: ROLE_NAMES.CONTRIBUTOR,
        type: ROLE_TYPES.INTERNAL,
        description:
            'Team member who receives and works on assigned tasks. Limited visibility to assigned projects. Permissions can only be revoked/reinstated, never expanded beyond default.',
        isSystem: true,
        permissions: CONTRIBUTOR_PERMISSIONS,
    },
    [ROLE_NAMES.CLIENT]: {
        name: ROLE_NAMES.CLIENT,
        type: ROLE_TYPES.EXTERNAL,
        description: 'External user with portal access. Read-only view of specific projects.',
        isSystem: true,
        permissions: CLIENT_PERMISSIONS,
    },
};

// ──────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────

/**
 * Check if a role name is valid
 */
export function isValidRole(roleName: string): roleName is RoleName {
    return Object.values(ROLE_NAMES).includes(roleName as RoleName);
}

/**
 * Get role definition by name
 */
export function getRoleDefinition(roleName: string): RoleDefinition | null {
    if (!isValidRole(roleName)) {
        return null;
    }
    return ROLE_DEFINITIONS[roleName];
}

/**
 * Check if a user has a specific resource permission.
 * Uses the user's ACTUAL permissions JSON (from DB), not the static defaults.
 */
export function hasPermission(
    userPermissions: RolePermissions | null | undefined,
    resource: ResourceType,
    action: PermissionAction
): boolean {
    if (!userPermissions) {
        return false;
    }

    const resourcePermissions = userPermissions[resource];
    if (!resourcePermissions || !Array.isArray(resourcePermissions)) {
        return false;
    }

    return resourcePermissions.includes(action);
}

/**
 * Check if a user has a specific meta-permission.
 */
export function hasMetaPermission(
    userPermissions: RolePermissions | null | undefined,
    metaPermission: MetaPermission
): boolean {
    if (!userPermissions) {
        return false;
    }
    const metaPerms = userPermissions['_meta'];
    if (!metaPerms || !Array.isArray(metaPerms)) {
        return false;
    }
    return metaPerms.includes(metaPermission);
}

/**
 * Get the default (maximum) permissions for a role name.
 */
export function getDefaultPermissions(roleName: string): RolePermissions | null {
    const roleDef = getRoleDefinition(roleName);
    return roleDef?.permissions || null;
}

/**
 * Validate that a proposed permission set does not exceed the maximum allowed for a role.
 * Returns true if the permissions are valid (within bounds), false otherwise.
 *
 * - For Managers: no upper bound (Organizer can grant anything; granting all = promotion track)
 * - For Contributors: cannot exceed CONTRIBUTOR_PERMISSIONS (the default)
 */
export function arePermissionsWithinBounds(
    roleName: string,
    proposedPermissions: RolePermissions
): boolean {
    if (roleName === ROLE_NAMES.ORGANIZER) {
        return true; // No bounds for organizers
    }

    if (roleName === ROLE_NAMES.MANAGER) {
        return true; // Organizer can grant managers any permission
    }

    if (roleName === ROLE_NAMES.CONTRIBUTOR) {
        // Contributors cannot exceed default permissions
        const maxPermissions = CONTRIBUTOR_PERMISSIONS;
        for (const resource of Object.keys(proposedPermissions)) {
            if (resource === '_meta') {
                // Contributors can never have meta-permissions
                const metaPerms = proposedPermissions[resource];
                if (Array.isArray(metaPerms) && metaPerms.length > 0) {
                    return false;
                }
                continue;
            }
            const proposed = proposedPermissions[resource];
            const max = maxPermissions[resource];
            if (!Array.isArray(proposed)) continue;
            if (!max || !Array.isArray(max)) {
                // Resource not in default → contributor can't have it
                if (proposed.length > 0) return false;
                continue;
            }
            // Every proposed action must be within the defaults
            for (const action of proposed) {
                if (!max.includes(action as PermissionAction)) {
                    return false;
                }
            }
        }
        return true;
    }

    if (roleName === ROLE_NAMES.CLIENT) {
        // Clients follow the same rule as Contributors — cannot exceed default
        const maxPermissions = CLIENT_PERMISSIONS;
        for (const resource of Object.keys(proposedPermissions)) {
            if (resource === '_meta') {
                const metaPerms = proposedPermissions[resource];
                if (Array.isArray(metaPerms) && metaPerms.length > 0) return false;
                continue;
            }
            const proposed = proposedPermissions[resource];
            const max = maxPermissions[resource];
            if (!Array.isArray(proposed)) continue;
            if (!max || !Array.isArray(max)) {
                if (proposed.length > 0) return false;
                continue;
            }
            for (const action of proposed) {
                if (!max.includes(action as PermissionAction)) return false;
            }
        }
        return true;
    }

    return false;
}

/**
 * Check if a set of permissions matches the Organizer defaults.
 * Used to detect when granting all permissions to a Manager = promotion.
 */
export function isEffectivelyOrganizer(permissions: RolePermissions): boolean {
    for (const resource of Object.keys(ORGANIZER_PERMISSIONS)) {
        if (resource === '_meta') continue; // Meta-permissions don't count for promotion check
        const required = ORGANIZER_PERMISSIONS[resource];
        const actual = permissions[resource];
        if (!Array.isArray(required)) continue;
        if (!Array.isArray(actual)) return false;
        for (const action of required) {
            if (!actual.includes(action)) return false;
        }
    }
    return true;
}

/**
 * Check if a role is internal (Organizer, Manager, Contributor)
 */
export function isInternalRole(roleName: string): boolean {
    const roleDefinition = getRoleDefinition(roleName);
    return roleDefinition?.type === ROLE_TYPES.INTERNAL;
}

/**
 * Check if a role is external (Client)
 */
export function isExternalRole(roleName: string): boolean {
    const roleDefinition = getRoleDefinition(roleName);
    return roleDefinition?.type === ROLE_TYPES.EXTERNAL;
}

/**
 * Get all internal roles
 */
export function getInternalRoles(): RoleName[] {
    return [ROLE_NAMES.ORGANIZER, ROLE_NAMES.MANAGER, ROLE_NAMES.CONTRIBUTOR];
}

/**
 * Get all external roles
 */
export function getExternalRoles(): RoleName[] {
    return [ROLE_NAMES.CLIENT];
}

/**
 * Get all role names
 */
export function getAllRoleNames(): RoleName[] {
    return Object.values(ROLE_NAMES);
}

/**
 * Get permissions for a role definition (DEFAULTS only)
 */
export function getRolePermissions(roleName: string): RolePermissions | null {
    const roleDefinition = getRoleDefinition(roleName);
    return roleDefinition?.permissions || null;
}

/**
 * Utility function to get role hierarchy level (for comparison)
 * Higher number = more permissions
 */
export function getRoleLevel(role: RoleName): number {
    switch (role) {
        case ROLE_NAMES.ORGANIZER:
            return 100;
        case ROLE_NAMES.MANAGER:
            return 50;
        case ROLE_NAMES.CONTRIBUTOR:
            return 25;
        case ROLE_NAMES.CLIENT:
            return 10;
        default:
            return 0;
    }
}

/**
 * Check if one role has higher or equal permissions than another
 */
export function hasHigherRole(userRole: RoleName, requiredRole: RoleName): boolean {
    return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}
