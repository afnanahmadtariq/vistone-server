import {
  createProjectMemberHandler,
  getAllProjectMembersHandler,
  getProjectMemberByIdHandler,
  updateProjectMemberHandler,
  deleteProjectMemberHandler,
} from './project-members.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    projectMember: {
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
  id: 'pm-1',
  projectId: 'proj-1',
  userId: 'user-1',
  role: 'DEVELOPER',
  joinedAt: new Date(),
};

describe('ProjectMembers Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createProjectMemberHandler', () => {
    it('creates and returns a project member', async () => {
      (prisma.projectMember.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { projectId: 'proj-1', userId: 'user-1' } };
      const res = mockRes();

      await createProjectMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.projectMember.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createProjectMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllProjectMembersHandler', () => {
    it('returns all project members', async () => {
      (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllProjectMembersHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getProjectMemberByIdHandler', () => {
    it('returns member by id', async () => {
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'pm-1' } };
      const res = mockRes();

      await getProjectMemberByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getProjectMemberByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateProjectMemberHandler', () => {
    it('updates and returns member', async () => {
      const updated = { ...sample, role: 'LEAD' };
      (prisma.projectMember.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'pm-1' }, body: { role: 'LEAD' } };
      const res = mockRes();

      await updateProjectMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteProjectMemberHandler', () => {
    it('deletes member and returns success', async () => {
      (prisma.projectMember.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'pm-1' } };
      const res = mockRes();

      await deleteProjectMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
