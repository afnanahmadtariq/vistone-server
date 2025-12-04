import { authClient } from '../services/backendClient';

export interface AuthUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  avatar: string | null;
  status: string;
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

  // Check cache first
  const cached = authCache.get(context.token);
  if (cached && cached.expiresAt > new Date()) {
    return cached.user;
  }

  try {
    const user = await authClient.postWithAuth('/auth/me', {}, context.token) as AuthUser;
    
    // Cache the user
    authCache.set(context.token, {
      user,
      expiresAt: new Date(Date.now() + CACHE_TTL),
    });
    
    return user;
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(context: AuthContext): Promise<AuthUser> {
  const user = await getCurrentUser(context);
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

/**
 * Check if the user has a specific role (Admin, Manager, etc.)
 */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.role?.toLowerCase() === role.toLowerCase();
}

/**
 * Check if the user is an Admin
 */
export function isAdmin(user: AuthUser): boolean {
  return hasRole(user, 'Admin');
}

/**
 * Check if the user has a specific permission
 */
export function hasPermission(user: AuthUser, resource: string, action: string): boolean {
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
 * Require the user to be an Admin - throws if not
 */
export async function requireAdmin(context: AuthContext): Promise<AuthUser> {
  const user = await requireAuth(context);
  if (!isAdmin(user)) {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}

/**
 * Require the user to have a specific permission - throws if not
 */
export async function requirePermission(
  context: AuthContext,
  resource: string,
  action: string
): Promise<AuthUser> {
  const user = await requireAuth(context);
  
  // Admins have all permissions
  if (isAdmin(user)) {
    return user;
  }
  
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
 * Require the user to belong to a specific organization - throws if not
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

// Clear cache periodically
setInterval(() => {
  const now = new Date();
  for (const [key, value] of authCache.entries()) {
    if (value.expiresAt < now) {
      authCache.delete(key);
    }
  }
}, 60000); // Clean up every minute
