import {
  createTeamMemberHandler,
  getAllTeamMembersHandler,
  getTeamMemberByIdHandler,
  updateTeamMemberHandler,
  deleteTeamMemberHandler,
} from './team-members.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    teamMember: {
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

const sample = {
  id: 'tm-1',
  teamId: 'team-1',
  userId: 'user-1',
  role: 'member',
  joinedAt: new Date(),
};

describe('TeamMembers Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTeamMemberHandler', () => {
    it('creates and returns a team member', async () => {
      (prisma.teamMember.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { teamId: 'team-1', userId: 'user-1' } };
      const res = mockRes();

      await createTeamMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.teamMember.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createTeamMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllTeamMembersHandler', () => {
    it('returns all team members', async () => {
      (prisma.teamMember.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllTeamMembersHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getTeamMemberByIdHandler', () => {
    it('returns member by id', async () => {
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'tm-1' } };
      const res = mockRes();

      await getTeamMemberByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getTeamMemberByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTeamMemberHandler', () => {
    it('updates and returns member', async () => {
      const updated = { ...sample, role: 'lead' };
      (prisma.teamMember.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'tm-1' }, body: { role: 'lead' } };
      const res = mockRes();

      await updateTeamMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteTeamMemberHandler', () => {
    it('deletes member and returns success', async () => {
      (prisma.teamMember.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'tm-1' } };
      const res = mockRes();

      await deleteTeamMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
