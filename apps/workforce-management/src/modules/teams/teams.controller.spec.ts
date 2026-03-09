import {
  createTeamHandler,
  getAllTeamsHandler,
  getTeamByIdHandler,
  updateTeamHandler,
  deleteTeamHandler,
  removeMemberFromTeamHandler,
} from './teams.controller';

jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    team: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
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

const sampleTeam = {
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Engineering',
  description: null,
  managerId: 'user-mgr',
  createdAt: new Date(),
  updatedAt: new Date(),
  members: [
    { id: 'tm-1', teamId: 'team-1', userId: 'user-1', role: null, createdAt: new Date(), updatedAt: new Date() },
  ],
};

const sampleUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@test.com',
  jobTitle: 'Dev',
  status: 'active',
};

describe('Teams Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ────────── createTeamHandler ────────── */
  describe('createTeamHandler', () => {
    it('creates and returns a team', async () => {
      const created = { id: 'team-1', name: 'Engineering' };
      (prisma.team.create as jest.Mock).mockResolvedValue(created);
      const req: any = { body: { organizationId: 'org-1', name: 'Engineering' } };
      const res = mockRes();
      await createTeamHandler(req, res);
      expect(prisma.team.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it('returns 500 on error', async () => {
      (prisma.team.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createTeamHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── getAllTeamsHandler ────────── */
  describe('getAllTeamsHandler', () => {
    it('returns enhanced teams with user data from auth service', async () => {
      (prisma.team.findMany as jest.Mock).mockResolvedValue([sampleTeam]);
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/users/')) return Promise.resolve({ data: sampleUser });
        if (url.includes('/organization-members')) return Promise.resolve({ data: [{ roleId: 'r1' }] });
        if (url.includes('/roles/')) return Promise.resolve({ data: { name: 'Contributor' } });
        return Promise.resolve({ data: [] });
      });
      const req: any = { query: {} };
      const res = mockRes();
      await getAllTeamsHandler(req, res);
      expect(res.json).toHaveBeenCalled();
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('memberCount');
      expect(result[0]).toHaveProperty('manager');
      expect(result[0]).toHaveProperty('members');
    });

    it('filters by organizationId', async () => {
      (prisma.team.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { organizationId: 'org-1' } };
      const res = mockRes();
      await getAllTeamsHandler(req, res);
      expect(prisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
    });

    it('returns 500 on error', async () => {
      (prisma.team.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { query: {} };
      const res = mockRes();
      await getAllTeamsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── getTeamByIdHandler ────────── */
  describe('getTeamByIdHandler', () => {
    it('returns enhanced team with projects', async () => {
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(sampleTeam);
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/users/')) return Promise.resolve({ data: sampleUser });
        if (url.includes('/organization-members')) return Promise.resolve({ data: [] });
        if (url.includes('/projects')) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: {} });
      });
      const req: any = { params: { id: 'team-1' } };
      const res = mockRes();
      await getTeamByIdHandler(req, res);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result).toHaveProperty('ongoingProjects');
      expect(result).toHaveProperty('completedProjects');
    });

    it('returns 404 when not found', async () => {
      (prisma.team.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getTeamByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Team not found' });
    });

    it('returns 500 on error', async () => {
      (prisma.team.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'team-1' } };
      const res = mockRes();
      await getTeamByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── updateTeamHandler ────────── */
  describe('updateTeamHandler', () => {
    it('updates and returns team', async () => {
      const updated = { id: 'team-1', name: 'Platform' };
      (prisma.team.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'team-1' }, body: { name: 'Platform' } };
      const res = mockRes();
      await updateTeamHandler(req, res);
      expect(prisma.team.update).toHaveBeenCalledWith({ where: { id: 'team-1' }, data: { name: 'Platform' } });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.team.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'team-1' }, body: {} };
      const res = mockRes();
      await updateTeamHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── deleteTeamHandler ────────── */
  describe('deleteTeamHandler', () => {
    it('deletes team members first, then team', async () => {
      (prisma.teamMember.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.team.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'team-1' } };
      const res = mockRes();
      await deleteTeamHandler(req, res);
      expect(prisma.teamMember.deleteMany).toHaveBeenCalledWith({ where: { teamId: 'team-1' } });
      expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: 'team-1' } });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Team deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.teamMember.deleteMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'team-1' } };
      const res = mockRes();
      await deleteTeamHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── removeMemberFromTeamHandler ────────── */
  describe('removeMemberFromTeamHandler', () => {
    it('returns 400 when teamId or memberId missing', async () => {
      const req: any = { body: { teamId: 'team-1' } };
      const res = mockRes();
      await removeMemberFromTeamHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when team member not found', async () => {
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);
      const req: any = { body: { teamId: 'team-1', memberId: 'user-99' } };
      const res = mockRes();
      await removeMemberFromTeamHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('removes team member successfully', async () => {
      (prisma.teamMember.findFirst as jest.Mock).mockResolvedValue({ id: 'tm-1' });
      (prisma.teamMember.delete as jest.Mock).mockResolvedValue({});
      const req: any = { body: { teamId: 'team-1', memberId: 'user-1' } };
      const res = mockRes();
      await removeMemberFromTeamHandler(req, res);
      expect(prisma.teamMember.delete).toHaveBeenCalledWith({ where: { id: 'tm-1' } });
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 500 on error', async () => {
      (prisma.teamMember.findFirst as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { teamId: 'team-1', memberId: 'user-1' } };
      const res = mockRes();
      await removeMemberFromTeamHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
