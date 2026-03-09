/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  loginHandler,
  registerHandler,
  googleOauthHandler,
  refreshTokenHandler,
  logoutHandler,
  acceptInviteHandler,
  getCurrentUserMeHandler,
  getInviteDetailsHandler,
  createInvitationHandler,
} from './auth.controller';

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    organization: { findUnique: jest.fn(), create: jest.fn() },
    role: { create: jest.fn(), findFirst: jest.fn() },
    organizationMember: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    invitation: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: jest.fn().mockReturnValue('mock-token-hex') }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({ digest: jest.fn().mockReturnValue('hashed-password') }),
  }),
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('../activity-logs/activity-logs.controller', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../lib/roles', () => ({
  ROLE_NAMES: { ORGANIZER: 'Organizer', MANAGER: 'Manager', CONTRIBUTOR: 'Contributor', CLIENT: 'Client' },
  ORGANIZER_PERMISSIONS: { users: ['create', 'read', 'update', 'delete'] },
}));

import prisma from '../../lib/prisma';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

const fakeUser = {
  id: 'u1', email: 'test@test.com', firstName: 'John', lastName: 'Doe',
  password: 'hashed-password', avatarUrl: null, status: 'active',
  createdAt: new Date(), googleId: null,
};

const fakeOrg = { id: 'org-1', name: 'Acme', slug: 'acme', createdAt: new Date(), updatedAt: new Date() };
const fakeRole = { id: 'role-1', organizationId: 'org-1', name: 'Organizer', permissions: {}, isSystem: true, createdAt: new Date(), updatedAt: new Date() };
const fakeMembership = { id: 'mem-1', organizationId: 'org-1', userId: 'u1', roleId: 'role-1', organization: fakeOrg, role: fakeRole, createdAt: new Date(), updatedAt: new Date() };

describe('Auth Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- loginHandler ---
  describe('loginHandler', () => {
    it('returns 400 if email or password missing', async () => {
      const req: any = { body: { email: 'a@b.com' }, headers: {} };
      const res = mockRes();
      await loginHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
    });

    it('returns 401 if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { body: { email: 'a@b.com', password: 'pass' }, headers: {} };
      const res = mockRes();
      await loginHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('returns 401 if password mismatch', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...fakeUser, password: 'different-hash' });
      const req: any = { body: { email: 'test@test.com', password: 'wrong' }, headers: {} };
      const res = mockRes();
      await loginHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('returns tokens and user on successful login', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
      (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([fakeMembership]);
      const req: any = { body: { email: 'test@test.com', password: 'pass' }, headers: {} };
      const res = mockRes();
      await loginHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: expect.any(String), refreshToken: expect.any(String), user: expect.any(Object) })
      );
    });

    it('returns 500 on exception', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { email: 'a@b.com', password: 'p' }, headers: {} };
      const res = mockRes();
      await loginHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- registerHandler ---
  describe('registerHandler', () => {
    it('returns 400 if required fields missing', async () => {
      const req: any = { body: { email: 'a@b.com' }, headers: {} };
      const res = mockRes();
      await registerHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name, email, and password are required' });
    });

    it('returns 400 if user already exists with password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
      const req: any = { body: { name: 'John', email: 'test@test.com', password: 'pass' }, headers: {} };
      const res = mockRes();
      await registerHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'User already exists' });
    });

    it('allows invited user (no password) to claim account', async () => {
      const invitedUser = { ...fakeUser, password: null };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(invitedUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...invitedUser, password: 'hashed-password' });
      (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([fakeMembership]);
      const req: any = { body: { name: 'John Doe', email: 'test@test.com', password: 'pass' }, headers: {} };
      const res = mockRes();
      await registerHandler(req, res);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accessToken: expect.any(String), isNewUser: false }));
    });

    it('creates new user and organization', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(fakeUser);
      // createOrganizationForUser mocks
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null); // slug available
      (prisma.organization.create as jest.Mock).mockResolvedValue(fakeOrg);
      (prisma.role.create as jest.Mock).mockResolvedValue(fakeRole);
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue(fakeMembership);
      (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([fakeMembership]);

      const req: any = { body: { name: 'John Doe', email: 'new@test.com', password: 'pass' }, headers: {} };
      const res = mockRes();
      await registerHandler(req, res);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.organization.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accessToken: expect.any(String), isNewUser: true }));
    });

    it('returns 500 on exception', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { name: 'A', email: 'a@b.com', password: 'p' }, headers: {} };
      const res = mockRes();
      await registerHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- googleOauthHandler ---
  describe('googleOauthHandler', () => {
    it('returns 400 if idToken missing', async () => {
      const req: any = { body: {}, headers: {} };
      const res = mockRes();
      await googleOauthHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Google ID token is required' });
    });

    it('returns 500 when Google OAuth fails (no valid config or verification)', async () => {
      // When GOOGLE_CLIENT_ID is empty → 'Google OAuth is not configured'
      // When GOOGLE_CLIENT_ID is set but verifyIdToken mock returns undefined → catch block
      const req: any = { body: { idToken: 'tok' }, headers: {} };
      const res = mockRes();
      await googleOauthHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- refreshTokenHandler ---
  describe('refreshTokenHandler', () => {
    it('returns 400 if refreshToken missing', async () => {
      const req: any = { body: {} };
      const res = mockRes();
      await refreshTokenHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Refresh token is required' });
    });

    it('returns 401 if token not in store', async () => {
      const req: any = { body: { refreshToken: 'unknown-token' } };
      const res = mockRes();
      await refreshTokenHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid refresh token' });
    });
  });

  // --- logoutHandler ---
  describe('logoutHandler', () => {
    it('returns true on logout (no token)', async () => {
      const req: any = { headers: {} };
      const res = mockRes();
      await logoutHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(true);
    });

    it('returns true on logout with Bearer token', async () => {
      const req: any = { headers: { authorization: 'Bearer some-token' } };
      const res = mockRes();
      await logoutHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(true);
    });
  });

  // --- acceptInviteHandler ---
  describe('acceptInviteHandler', () => {
    it('returns 400 if token missing', async () => {
      const req: any = { body: {}, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token is required' });
    });

    it('returns 404 if invitation not found', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { body: { token: 'bad-tok' }, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid invitation token' });
    });

    it('returns 400 if invitation expired', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok', email: 'a@b.com', expiresAt: new Date('2000-01-01'), acceptedAt: null, organizationId: 'org-1',
      });
      const req: any = { body: { token: 'tok' }, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invitation link has expired' });
    });

    it('returns 400 if invitation already accepted', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok', email: 'a@b.com', expiresAt: new Date('2099-01-01'), acceptedAt: new Date(), organizationId: 'org-1',
      });
      const req: any = { body: { token: 'tok' }, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invitation has already been accepted. Please log in.' });
    });

    it('creates new user and membership on valid invite', async () => {
      const invitation = {
        id: 'inv-1', token: 'tok', email: 'new@test.com', expiresAt: new Date('2099-01-01'),
        acceptedAt: null, organizationId: 'org-1', role: 'Contributor',
      };
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(invitation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ ...fakeUser, id: 'u-new', email: 'new@test.com' });
      (prisma.role.findFirst as jest.Mock).mockResolvedValue(fakeRole);
      (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue(fakeMembership);
      (prisma.invitation.update as jest.Mock).mockResolvedValue({});
      (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([fakeMembership]);

      const req: any = { body: { token: 'tok', name: 'New User', password: 'pass' }, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.invitation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'inv-1' },
        data: { acceptedAt: expect.any(Date) },
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accessToken: expect.any(String) }));
    });

    it('returns 400 if new user but no name/password', async () => {
      const invitation = {
        id: 'inv-1', token: 'tok', email: 'new@test.com', expiresAt: new Date('2099-01-01'),
        acceptedAt: null, organizationId: 'org-1', role: 'Contributor',
      };
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(invitation);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req: any = { body: { token: 'tok' }, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name and password are required for new users' });
    });

    it('returns 500 on exception', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { token: 'tok' }, headers: {} };
      const res = mockRes();
      await acceptInviteHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- getCurrentUserMeHandler ---
  describe('getCurrentUserMeHandler', () => {
    it('returns 401 if no auth header', async () => {
      const req: any = { headers: {} };
      const res = mockRes();
      await getCurrentUserMeHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
    });

    it('returns 401 if token not in store', async () => {
      const req: any = { headers: { authorization: 'Bearer unknown' } };
      const res = mockRes();
      await getCurrentUserMeHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  // --- getInviteDetailsHandler ---
  describe('getInviteDetailsHandler', () => {
    it('returns 400 if token param missing', async () => {
      const req: any = { params: {} };
      const res = mockRes();
      await getInviteDetailsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if invitation not found', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { token: 'bad' } };
      const res = mockRes();
      await getInviteDetailsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 if expired', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok', email: 'a@b.com', expiresAt: new Date('2000-01-01'), acceptedAt: null, organizationId: 'org-1',
      });
      const req: any = { params: { token: 'tok' } };
      const res = mockRes();
      await getInviteDetailsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invitation link has expired' });
    });

    it('returns 400 if already accepted', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok', email: 'a@b.com', expiresAt: new Date('2099-01-01'), acceptedAt: new Date(), organizationId: 'org-1',
      });
      const req: any = { params: { token: 'tok' } };
      const res = mockRes();
      await getInviteDetailsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invitation has already been accepted' });
    });

    it('returns invite details with organization name', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockResolvedValue({
        token: 'tok', email: 'a@b.com', expiresAt: new Date('2099-01-01'), acceptedAt: null,
        organizationId: 'org-1', role: 'Contributor',
      });
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(fakeOrg);
      const req: any = { params: { token: 'tok' } };
      const res = mockRes();
      await getInviteDetailsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({
        email: 'a@b.com',
        firstName: '',
        lastName: '',
        role: 'Contributor',
        organizationName: 'Acme',
      });
    });

    it('returns 500 on exception', async () => {
      (prisma.invitation.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { token: 'tok' } };
      const res = mockRes();
      await getInviteDetailsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- createInvitationHandler ---
  describe('createInvitationHandler', () => {
    it('returns 400 if email or organizationId missing', async () => {
      const req: any = { body: { email: 'a@b.com' } };
      const res = mockRes();
      await createInvitationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and organizationId are required' });
    });

    it('creates invitation and returns token', async () => {
      (prisma.invitation.create as jest.Mock).mockResolvedValue({ token: 'mock-uuid' });
      const req: any = { body: { email: 'a@b.com', organizationId: 'org-1', role: 'Manager' } };
      const res = mockRes();
      await createInvitationHandler(req, res);
      expect(prisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'a@b.com',
          role: 'Manager',
          token: 'mock-uuid',
          organizationId: 'org-1',
        }),
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, token: 'mock-uuid' });
    });

    it('defaults role to Member', async () => {
      (prisma.invitation.create as jest.Mock).mockResolvedValue({ token: 'mock-uuid' });
      const req: any = { body: { email: 'a@b.com', organizationId: 'org-1' } };
      const res = mockRes();
      await createInvitationHandler(req, res);
      expect(prisma.invitation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: 'Member' }),
      });
    });

    it('returns 500 on exception', async () => {
      (prisma.invitation.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { email: 'a@b.com', organizationId: 'org-1' } };
      const res = mockRes();
      await createInvitationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
