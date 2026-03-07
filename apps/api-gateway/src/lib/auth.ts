import { authClient } from '../services/backendClient';

export interface AuthUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  avatar: string | null;
  status: string; // 'active' | 'paused'
  skills: string[];
  teamId: string | null;
  joinedAt: Date;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  permissions: Record<string, string[]> | null;
}

export interface AuthContext {
  headers: Record<string, string | string[] | undefined>;
  token?: string;
  user?: AuthUser;
}

// Cache for authenticated users
const authCache = new Map<string, { user: AuthUser; expiresAt: Date }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Get the current authenticated user from the token
 */
export async function getCurrentUser(context: AuthContext): Promise<AuthUser | null> {
  if (!context.token) {
    return null;
  }

  const requestedOrgId = context.headers['x-organization-id'] as string || '';
  const cacheKey = `${context.token}|${requestedOrgId}`;

  // Check cache first
  const cached = authCache.get(cacheKey);
  if (cached && cached.expiresAt > new Date()) {
    return cached.user;
  }

  try {
    const user = await authClient.postWithAuth('/auth/me', { organizationId: requestedOrgId }, context.token) as AuthUser;

    // Cache the user
    authCache.set(cacheKey, {
      user,
      expiresAt: new Date(Date.now() + CACHE_TTL),
    });

    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws if not authenticated
 */
export async function requireAuth(context: AuthContext): Promise<AuthUser> {
  const user = await getCurrentUser(context);
  if (!user) {
    throw new Error('Not authenticated');
  }
  // Check if user is paused
  if (user.status === 'paused') {
    throw new Error('Account is paused. Contact your organization administrator.');
  }
  return user;
}

/**
 * Check if the user is an Organizer
 */
export function isOrganizer(user: AuthUser): boolean {
  return user.role?.toLowerCase() === 'organizer';
}

/**
 * Check if the user has a specific role (case-insensitive)
 */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.role?.toLowerCase() === role.toLowerCase();
}

/**
 * Check if the user has a specific resource permission using their ACTUAL
 * permissions from the database (not static role definitions).
 */
export function hasPermission(user: AuthUser, resource: string, action: string): boolean {
  // Organizers always have full access (safety net on top of DB permissions)
  if (isOrganizer(user)) {
    return true;
  }

  if (!user.permissions) {
    return false;
  }

  const resourcePermissions = user.permissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  return resourcePermissions.includes(action) || resourcePermissions.includes('*');
}

/**
 * Check if the user has a specific meta-permission (e.g. manage_permissions, pause_contributors)
 */
export function hasMetaPermission(user: AuthUser, metaPermission: string): boolean {
  if (isOrganizer(user)) {
    return true; // Organizers have all meta-permissions
  }
  if (!user.permissions) {
    return false;
  }
  const meta = user.permissions['_meta'];
  if (!meta) {
    return false;
  }
  return meta.includes(metaPermission);
}

/**
 * Require the user to be an Organizer — throws if not
 */
export async function requireOrganizer(context: AuthContext): Promise<AuthUser> {
  const user = await requireAuth(context);
  if (!isOrganizer(user)) {
    throw new Error('Forbidden: Organizer access required');
  }
  return user;
}

/**
 * Require the user to have a minimum role level — throws if not
 */
export async function requireMinRole(context: AuthContext, minRole: string): Promise<AuthUser> {
  const user = await requireAuth(context);

  const roleLevels: Record<string, number> = {
    organizer: 100,
    manager: 50,
    contributor: 25,
    client: 10,
  };

  const userLevel = roleLevels[user.role?.toLowerCase() || ''] || 0;
  const requiredLevel = roleLevels[minRole.toLowerCase()] || 0;

  if (userLevel < requiredLevel) {
    throw new Error(`Forbidden: ${minRole} access required`);
  }

  return user;
}

/**
 * Require the user to have a specific permission — throws if not
 */
export async function requirePermission(
  context: AuthContext,
  resource: string,
  action: string
): Promise<AuthUser> {
  const user = await requireAuth(context);

  if (!hasPermission(user, resource, action)) {
    throw new Error(`Forbidden: Missing permission ${resource}:${action}`);
  }

  return user;
}

/**
 * Check if the user belongs to the same organization
 */
export function isSameOrganization(user: AuthUser, organizationId: string): boolean {
  return user.organizationId === organizationId;
}

/**
 * Require the user to belong to a specific organization — throws if not
 */
export async function requireOrganization(
  context: AuthContext,
  organizationId: string
): Promise<AuthUser> {
  const user = await requireAuth(context);

  if (!isSameOrganization(user, organizationId)) {
    throw new Error('Forbidden: Access denied to this organization');
  }

  return user;
}

/**
 * Get the user's organization ID, throwing if they don't have one.
 * This is the primary helper for org-scoping all data queries.
 */
export function getOrgId(user: AuthUser): string {
  if (!user.organizationId) {
    throw new Error('User does not belong to an organization');
  }
  return user.organizationId;
}

// Clear cache periodically
setInterval(() => {
  const now = new Date();
  for (const [key, value] of authCache.entries()) {
    if (value.expiresAt < now) {
      authCache.delete(key);
    }
  }
}, 60000); // Clean up every minute
