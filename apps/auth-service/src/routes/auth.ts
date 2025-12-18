import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { ROLE_NAMES, ORGANIZER_PERMISSIONS } from '../lib/roles';

const router = Router();

// Google OAuth Client - set your Google Client ID in environment variable
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Simple token generation (in production, use proper JWT library)
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Simple password hashing (in production, use bcrypt)
const hashPassword = (password: string): string => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Generate a URL-friendly slug from a name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
};

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map<string, { userId: string; expiresAt: Date }>();
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date }>();

// Use centralized role permissions from roles.ts
// ORGANIZER_PERMISSIONS is imported from '../lib/roles'

// Types for organization-related data
interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  settings?: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

interface RoleData {
  id: string;
  organizationId: string | null;
  name: string;
  permissions: Record<string, string[]>;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MembershipData {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to create organization, admin role, and membership for a new user
async function createOrganizationForUser(userId: string, organizationName: string): Promise<{
  organization: OrganizationData;
  role: RoleData;
  membership: MembershipData;
}> {
  // Generate a unique slug
  const baseSlug = generateSlug(organizationName);
  let slug = baseSlug;
  let counter = 1;

  // Check for slug uniqueness and append number if needed
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Create organization
  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      slug,
    },
  });

  // Create Organizer role for this organization (as per BACKEND_IMPLEMENTATION_PLAN.md)
  const role = await prisma.role.create({
    data: {
      organizationId: organization.id,
      name: ROLE_NAMES.ORGANIZER,
      permissions: ORGANIZER_PERMISSIONS,
      isSystem: true,
    },
  });

  // Add user as organization member with Organizer role
  const membership = await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId,
      roleId: role.id,
    },
  });

  return { organization, role, membership };
}

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    // Store tokens
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    tokenStore.set(accessToken, { userId: user.id, expiresAt: accessTokenExpiry });
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt: refreshTokenExpiry });

    // Get user's team membership
    const teamMember = await getTeamMembershipWithRole(user.id);

    // Get user's organization and role
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true, role: true },
    });

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(user, teamMember, membership?.organization, membership?.role),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let user;
    let organization;
    let role;
    let isNewUser = true;

    if (existingUser) {
      if (existingUser.password) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      // Invited user claiming account (setting password)
      isNewUser = false;
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || undefined;

      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          firstName: firstName || existingUser.firstName, // Use provided name or fallback to existing
          lastName: lastName || existingUser.lastName,
          password: hashPassword(password),
        },
      });

      // Fetch existing organization and role
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: { organization: true, role: true },
      });

      if (membership) {
        organization = membership.organization;
        role = membership.role;
      } else {
        // Edge case: User exists but has no organization? 
        // Should create one if they are claiming account but have no org?
        // For now, adhere to "signup = organizer" rules if no membership exists.
        const orgName = organizationName || `${firstName}'s Organization`;
        const orgData = await createOrganizationForUser(user.id, orgName);
        organization = orgData.organization;
        role = orgData.role;
      }
    } else {
      // Create entirely new user
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || undefined;

      user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          password: hashPassword(password),
        },
      });

      // Create organization for the new user
      const orgName = organizationName || `${firstName}'s Organization`;
      const orgData = await createOrganizationForUser(user.id, orgName);
      organization = orgData.organization;
      role = orgData.role;
    }

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    // Store tokens
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    tokenStore.set(accessToken, { userId: user.id, expiresAt: accessTokenExpiry });
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt: refreshTokenExpiry });

    // Get team membership if exists (might have been added during invite)
    const teamMember = await getTeamMembershipWithRole(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(user, teamMember, organization, role),
      isNewUser,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Google OAuth - handles both login and signup
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'Google ID token is required' });
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      res.status(500).json({ error: 'Google OAuth is not configured' });
      return;
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    const { sub: googleId, email, given_name, family_name, picture } = payload;

    if (!email) {
      res.status(400).json({ error: 'Email not provided by Google' });
      return;
    }

    // Check if user exists by email or googleId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId },
        ],
      },
    });

    let isNewUser = false;
    let organization = null;
    let role = null;

    if (user) {
      // Update user with Google info if not already set
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl: user.avatarUrl || picture,
          },
        });
      }

      // Get existing organization and role for returning user
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
        include: { organization: true, role: true },
      });

      if (membership) {
        organization = membership.organization;
        role = membership.role;
      }
    } else {
      // Create new user (signup with Google)
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          firstName: given_name || '',
          lastName: family_name || '',
          googleId,
          avatarUrl: picture,
          // No password for Google-only users
          password: null,
        },
      });

      // Create organization for the new user
      const orgName = `${given_name || 'User'}'s Organization`;
      const orgData = await createOrganizationForUser(user.id, orgName);
      organization = orgData.organization;
      role = orgData.role;
    }

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    // Store tokens
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    tokenStore.set(accessToken, { userId: user.id, expiresAt: accessTokenExpiry });
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt: refreshTokenExpiry });

    // Get user's team membership
    const teamMember = await getTeamMembershipWithRole(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(user, teamMember, organization, role),
      isNewUser,
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    if (error instanceof Error && error.message.includes('Token used too late')) {
      res.status(401).json({ error: 'Google token expired' });
      return;
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Refresh Token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const tokenData = refreshTokenStore.get(refreshToken);

    if (!tokenData) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    if (tokenData.expiresAt < new Date()) {
      refreshTokenStore.delete(refreshToken);
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }

    // Generate new tokens
    const newAccessToken = generateToken();
    const newRefreshToken = generateToken();

    // Store new tokens
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    tokenStore.set(newAccessToken, { userId: tokenData.userId, expiresAt: accessTokenExpiry });
    refreshTokenStore.set(newRefreshToken, { userId: tokenData.userId, expiresAt: refreshTokenExpiry });

    // Remove old refresh token
    refreshTokenStore.delete(refreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      tokenStore.delete(token);
    }

    res.json(true);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Accept Invite - Complete registration for invited users
router.post('/accept-invite', async (req: Request, res: Response) => {
  try {
    const { token, password, name, role } = req.body;

    if (!token || !password || !name) {
      res.status(400).json({ error: 'Token, password, and name are required' });
      return;
    }

    // The token is the user ID (as set in inviteMember resolver)
    const user = await prisma.user.findUnique({
      where: { id: token },
    });

    if (!user) {
      res.status(404).json({ error: 'Invalid invitation token' });
      return;
    }

    // Check if user already has a password (invite already accepted)
    if (user.password) {
      res.status(400).json({ error: 'Invitation has already been accepted. Please log in.' });
      return;
    }

    // Parse name into firstName and lastName
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Update user with password and name
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword(password),
        firstName,
        lastName,
      },
    });

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true, role: true },
    });

    // If role is specified and different from current, update the role
    let finalRole = membership?.role;
    if (role && membership) {
      // Find the role in the organization
      let roleRecord = await prisma.role.findFirst({
        where: {
          organizationId: membership.organizationId,
          name: { equals: role, mode: 'insensitive' },
        },
      });

      // Create role if doesn't exist
      if (!roleRecord && membership.organizationId) {
        const rolePermissionsLookup: Record<string, Record<string, string[]>> = {
          organizer: ORGANIZER_PERMISSIONS as Record<string, string[]>,
          manager: {
            users: ['read'],
            teams: ['read', 'update'],
            projects: ['read', 'update'],
            tasks: ['create', 'read', 'update', 'assign'],
            clients: ['read'],
            wiki: ['create', 'read', 'update'],
            channels: ['create', 'read', 'update'],
            settings: ['read'],
            reports: ['read'],
            notifications: ['read', 'update'],
          },
          contributor: {
            users: ['read'],
            teams: ['read'],
            projects: ['read'],
            tasks: ['read', 'update'],
            clients: [],
            wiki: ['read'],
            channels: ['read', 'update'],
            settings: [],
            reports: ['read'],
            notifications: ['read', 'update'],
          },
        };

        const normalizedRole = role.toLowerCase();
        const permissions = rolePermissionsLookup[normalizedRole];

        if (permissions) {
          roleRecord = await prisma.role.create({
            data: {
              organizationId: membership.organizationId,
              name: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
              permissions,
              isSystem: true,
            },
          });
        }
      }

      // Update membership with new role
      if (roleRecord) {
        await prisma.organizationMember.update({
          where: { id: membership.id },
          data: { roleId: roleRecord.id },
        });
        finalRole = roleRecord;
      }
    }

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    // Store tokens
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    tokenStore.set(accessToken, { userId: updatedUser.id, expiresAt: accessTokenExpiry });
    refreshTokenStore.set(refreshToken, { userId: updatedUser.id, expiresAt: refreshTokenExpiry });

    // Get team membership
    const teamMember = await getTeamMembershipWithRole(updatedUser.id);

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(updatedUser, teamMember, membership?.organization, finalRole),
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Get current user (me)
router.post('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const tokenData = tokenStore.get(token);

    if (!tokenData) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (tokenData.expiresAt < new Date()) {
      tokenStore.delete(token);
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const teamMember = await getTeamMembershipWithRole(user.id);

    // Get user's organization and role
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true, role: true },
    });

    res.json(formatAuthUser(user, teamMember, membership?.organization, membership?.role));
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Helper function to format user for auth response
interface UserData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl?: string | null;
  createdAt: Date;
}

interface TeamMemberData {
  role: string | null;
  teamId: string;
}

interface FormatOrganizationData {
  id: string;
  name: string;
  slug: string;
}

interface FormatRoleData {
  id: string;
  name: string;
  permissions: Record<string, string[]> | null;
}

function formatAuthUser(
  user: UserData,
  teamMember: TeamMemberData | null,
  organization?: FormatOrganizationData | null,
  role?: FormatRoleData | null
) {
  // Combine firstName and lastName into name
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

  return {
    id: user.id,
    name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: role?.name || teamMember?.role || 'member',
    avatar: user.avatarUrl || null,
    status: 'active',
    skills: [], // Could be extended to fetch from workforce service
    teamId: teamMember?.teamId || null,
    joinedAt: user.createdAt,
    organizationId: organization?.id || null,
    organization: organization ? {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    } : null,
    permissions: role?.permissions || null,
  };
}

// Helper function to get team membership (this would need cross-service call in production)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getTeamMembershipWithRole(_userId: string): Promise<TeamMemberData | null> {
  // In a real implementation, this would call the workforce service
  // For now, return null (user has no team)
  return null;
}

export default router;
