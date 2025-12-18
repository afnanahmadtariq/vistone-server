/**
 * Permission Middleware for Vistone
 *
 * This middleware provides role-based access control (RBAC) enforcement
 * based on the 4 defined roles: Organizer, Manager, Contributor, Client
 */

import { Request, Response, NextFunction } from 'express';
import {
    ROLE_NAMES,
    hasPermission,
    isValidRole,
    ResourceType,
    PermissionAction,
    RoleName,
} from '../lib/roles';

// Extend Express Request to include user role information
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: RoleName;
        organizationId?: string;
        teamIds?: string[];
    };
}

/**
 * Middleware to check if user has required permission for a resource
 *
 * @param resource - The resource type being accessed
 * @param action - The action being performed
 * @returns Express middleware function
 */
export function requirePermission(resource: ResourceType, action: PermissionAction) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!user.role || !isValidRole(user.role)) {
            res.status(403).json({ error: 'Invalid user role' });
            return;
        }

        // Organizers have full access
        if (user.role === ROLE_NAMES.ORGANIZER) {
            next();
            return;
        }

        // Check if role has the required permission
        if (!hasPermission(user.role, resource, action)) {
            res.status(403).json({
                error: 'Access denied',
                message: `Role '${user.role}' does not have '${action}' permission for '${resource}'`,
            });
            return;
        }

        next();
    };
}

/**
 * Middleware to check if user has one of the required roles
 *
 * @param roles - Array of allowed role names
 * @returns Express middleware function
 */
export function requireRole(...roles: RoleName[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!user.role || !isValidRole(user.role)) {
            res.status(403).json({ error: 'Invalid user role' });
            return;
        }

        if (!roles.includes(user.role)) {
            res.status(403).json({
                error: 'Access denied',
                message: `This action requires one of the following roles: ${roles.join(', ')}`,
            });
            return;
        }

        next();
    };
}

/**
 * Middleware to require internal user (Organizer, Manager, or Contributor)
 */
export function requireInternalUser() {
    return requireRole(ROLE_NAMES.ORGANIZER, ROLE_NAMES.MANAGER, ROLE_NAMES.CONTRIBUTOR);
}

/**
 * Middleware to require Organizer role (full access)
 */
export function requireOrganizer() {
    return requireRole(ROLE_NAMES.ORGANIZER);
}

/**
 * Middleware to require at least Manager role (Manager or Organizer)
 */
export function requireManager() {
    return requireRole(ROLE_NAMES.ORGANIZER, ROLE_NAMES.MANAGER);
}

/**
 * Middleware to check if user is a manager of a specific team
 *
 * @param getTeamId - Function to extract team ID from request
 * @returns Express middleware function
 */
export function requireTeamManager(getTeamId: (req: AuthenticatedRequest) => string | undefined) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const user = req.user;

        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Organizers can manage any team
        if (user.role === ROLE_NAMES.ORGANIZER) {
            next();
            return;
        }

        // Only Managers and Organizers can manage teams
        if (user.role !== ROLE_NAMES.MANAGER) {
            res.status(403).json({
                error: 'Access denied',
                message: 'Only Managers and Organizers can perform this action',
            });
            return;
        }

        const teamId = getTeamId(req);
        if (!teamId) {
            res.status(400).json({ error: 'Team ID is required' });
            return;
        }

        // Check if user is manager of this specific team
        // This would need to be implemented with actual database check
        // For now, we'll pass through and let the route handler verify
        // TODO: Implement team manager verification via workforce service
        next();
    };
}

/**
 * Middleware to check if user can access a specific project
 *
 * @param getProjectId - Function to extract project ID from request
 * @returns Express middleware function
 */
export function requireProjectAccess(
    getProjectId: (req: AuthenticatedRequest) => string | undefined
) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const user = req.user;

        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Organizers can access any project
        if (user.role === ROLE_NAMES.ORGANIZER) {
            next();
            return;
        }

        const projectId = getProjectId(req);
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }

        // For other roles, verify project access
        // This would need to be implemented with actual database check
        // Contributors and Clients should only see projects they're assigned to
        // Managers should only see projects their teams are assigned to
        // TODO: Implement project access verification via project service
        next();
    };
}

/**
 * Middleware to check if user can access a specific task
 *
 * @param getTaskId - Function to extract task ID from request
 * @returns Express middleware function
 */
export function requireTaskAccess(getTaskId: (req: AuthenticatedRequest) => string | undefined) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const user = req.user;

        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // Organizers can access any task
        if (user.role === ROLE_NAMES.ORGANIZER) {
            next();
            return;
        }

        const taskId = getTaskId(req);
        if (!taskId) {
            res.status(400).json({ error: 'Task ID is required' });
            return;
        }

        // For other roles, verify task access based on assignment
        // Contributors can only see tasks assigned to them
        // Managers can see tasks assigned to their teams
        // TODO: Implement task access verification via project service
        next();
    };
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
