/**
 * Role Definitions for Vistone
 *
 * This file defines the 4 user roles as per the BACKEND_IMPLEMENTATION_PLAN.md:
 * - 3 Internal roles: Organizer, Manager, Contributor
 * - 1 External role: Client
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

// Permission definition structure
export interface RolePermissions {
    [resource: string]: PermissionAction[];
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
 * Organizer Role
 * - Full system access and control
 * - Creates Projects, Teams, and assigns Managers to Teams
 * - Can customize granular permissions for any Manager, Team, or Contributor
 * - Assigns tasks to Teams or directly to Contributors
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
};

/**
 * Manager Role
 * - Assigned to one or more Teams by the Organizer
 * - Manages Contributors within their assigned Teams
 * - Receives tasks assigned to their Team(s)
 * - Delegates these tasks to specific Contributors within the Team
 * - Can view/edit tasks within their Teams (scope defined by Organizer)
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
};

/**
 * Contributor Role
 * - Member of one or more Teams
 * - Receives tasks assigned by their Manager
 * - Views only tasks assigned to them
 * - Limited project visibility (only projects they're assigned to)
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
};

/**
 * Client Role (External)
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
};

// Complete role definitions
export const ROLE_DEFINITIONS: Record<RoleName, RoleDefinition> = {
    [ROLE_NAMES.ORGANIZER]: {
        name: ROLE_NAMES.ORGANIZER,
        type: ROLE_TYPES.INTERNAL,
        description:
            'Full system access. Creates projects, teams, and assigns managers. Can customize permissions.',
        isSystem: true,
        permissions: ORGANIZER_PERMISSIONS,
    },
    [ROLE_NAMES.MANAGER]: {
        name: ROLE_NAMES.MANAGER,
        type: ROLE_TYPES.INTERNAL,
        description:
            'Manages teams and contributors. Receives and delegates tasks within assigned teams.',
        isSystem: true,
        permissions: MANAGER_PERMISSIONS,
    },
    [ROLE_NAMES.CONTRIBUTOR]: {
        name: ROLE_NAMES.CONTRIBUTOR,
        type: ROLE_TYPES.INTERNAL,
        description:
            'Team member who receives and works on assigned tasks. Limited visibility to assigned projects.',
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

// Helper functions

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
 * Check if a role has a specific permission
 */
export function hasPermission(
    roleName: string,
    resource: ResourceType,
    action: PermissionAction
): boolean {
    const roleDefinition = getRoleDefinition(roleName);
    if (!roleDefinition) {
        return false;
    }

    const resourcePermissions = roleDefinition.permissions[resource];
    if (!resourcePermissions) {
        return false;
    }

    return resourcePermissions.includes(action);
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
 * Get permissions for a role
 */
export function getRolePermissions(roleName: string): RolePermissions | null {
    const roleDefinition = getRoleDefinition(roleName);
    return roleDefinition?.permissions || null;
}
