import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

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

// In-memory token store (in production, use Redis or database)
const tokenStore = new Map<string, { userId: string; expiresAt: Date }>();
const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date }>();

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

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(user, teamMember),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Parse name into firstName and lastName
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashPassword(password),
      },
    });

    // Generate tokens
    const accessToken = generateToken();
    const refreshToken = generateToken();

    // Store tokens
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    tokenStore.set(accessToken, { userId: user.id, expiresAt: accessTokenExpiry });
    refreshTokenStore.set(refreshToken, { userId: user.id, expiresAt: refreshTokenExpiry });

    res.json({
      accessToken,
      refreshToken,
      user: formatAuthUser(user, null),
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
      user: formatAuthUser(user, teamMember),
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

    res.json(formatAuthUser(user, teamMember));
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

function formatAuthUser(user: UserData, teamMember: TeamMemberData | null) {
  // Combine firstName and lastName into name
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  
  return {
    id: user.id,
    name,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: teamMember?.role || 'member',
    avatar: user.avatarUrl || null,
    status: 'active',
    skills: [], // Could be extended to fetch from workforce service
    teamId: teamMember?.teamId || null,
    joinedAt: user.createdAt,
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
