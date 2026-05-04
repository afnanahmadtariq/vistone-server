import {
  createUserHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler,
} from './users.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

const sampleUser = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  createdAt: new Date(),
};

describe('Users Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createUserHandler ───────────────────────────────────────
  describe('createUserHandler', () => {
    it('creates a user and returns it', async () => {
      (prisma.user.create as jest.Mock).mockResolvedValue(sampleUser);
      const req: any = { body: { email: 'alice@example.com', firstName: 'Alice' } };
      const res = mockRes();

      await createUserHandler(req, res);

      expect(prisma.user.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sampleUser);
    });

    it('returns 500 on database error', async () => {
      (prisma.user.create as jest.Mock).mockRejectedValue(new Error('DB error'));
      const req: any = { body: {} };
      const res = mockRes();

      await createUserHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create user' });
    });
  });

  // ── getAllUsersHandler ──────────────────────────────────────
  describe('getAllUsersHandler', () => {
    it('returns all users', async () => {
      const users = [sampleUser];
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);
      const req: any = {};
      const res = mockRes();

      await getAllUsersHandler(req, res);

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it('returns 500 on database error', async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));
      const req: any = {};
      const res = mockRes();

      await getAllUsersHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch users' });
    });
  });

  // ── getUserByIdHandler ──────────────────────────────────────
  describe('getUserByIdHandler', () => {
    it('returns the user when found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(sampleUser);
      const req: any = { params: { id: 'user-1' } };
      const res = mockRes();

      await getUserByIdHandler(req, res);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(res.json).toHaveBeenCalledWith(sampleUser);
    });

    it('returns 404 when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getUserByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('returns 500 on database error', async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
      const req: any = { params: { id: 'user-1' } };
      const res = mockRes();

      await getUserByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch user' });
    });
  });

  // ── updateUserHandler ───────────────────────────────────────
  describe('updateUserHandler', () => {
    it('updates and returns the user', async () => {
      const updated = { ...sampleUser, firstName: 'Alicia' };
      (prisma.user.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'user-1' }, body: { firstName: 'Alicia' } };
      const res = mockRes();

      await updateUserHandler(req, res);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Alicia' },
      });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on database error', async () => {
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('DB error'));
      const req: any = { params: { id: 'user-1' }, body: {} };
      const res = mockRes();

      await updateUserHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update user' });
    });
  });

  // ── deleteUserHandler ───────────────────────────────────────
  describe('deleteUserHandler', () => {
    it('deletes the user and returns success', async () => {
      (prisma.user.delete as jest.Mock).mockResolvedValue(sampleUser);
      const req: any = { params: { id: 'user-1' } };
      const res = mockRes();

      await deleteUserHandler(req, res);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'User deleted' });
    });

    it('returns 500 on database error', async () => {
      (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('DB error'));
      const req: any = { params: { id: 'user-1' } };
      const res = mockRes();

      await deleteUserHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
