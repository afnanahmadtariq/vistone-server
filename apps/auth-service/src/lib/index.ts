/**
 * Auth Service Library Exports
 *
 * Central export file for auth-service library modules
 */

// Role definitions and utilities
export {
    ROLE_NAMES,
    ROLE_TYPES,
    ROLE_DEFINITIONS,
    ORGANIZER_PERMISSIONS,
    MANAGER_PERMISSIONS,
    CONTRIBUTOR_PERMISSIONS,
    CLIENT_PERMISSIONS,
    isValidRole,
    getRoleDefinition,
    hasPermission,
    isInternalRole,
    isExternalRole,
    getInternalRoles,
    getExternalRoles,
    getAllRoleNames,
    getRolePermissions,
} from './roles';

export type {
    RoleName,
    RoleType,
    PermissionAction,
    ResourceType,
    RolePermissions,
    RoleDefinition,
} from './roles';

// Permission middleware
export {
    requirePermission,
    requireRole,
    requireInternalUser,
    requireOrganizer,
    requireManager,
    requireTeamManager,
    requireProjectAccess,
    requireTaskAccess,
    getRoleLevel,
    hasHigherRole,
} from './permission-middleware';

export type { AuthenticatedRequest } from './permission-middleware';

// Prisma client
export { default as prisma } from './prisma';
