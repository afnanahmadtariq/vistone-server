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
      findFirst: jest.fn(),
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
      (prisma.projectMember.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.projectMember.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { projectId: 'proj-1', userId: 'user-1' } };
      const res = mockRes();

      await createProjectMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 400 when required fields are missing', async () => {
      (prisma.projectMember.findFirst as jest.Mock).mockResolvedValue(null);
      const req: any = { body: {} };
      const res = mockRes();

      await createProjectMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.projectMember.create).not.toHaveBeenCalled();
    });

    it('returns 409 when member already exists', async () => {
      (prisma.projectMember.findFirst as jest.Mock).mockResolvedValue({ id: 'pm-2' });
      const req: any = { body: { projectId: 'proj-1', userId: 'user-1' } };
      const res = mockRes();

      await createProjectMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(prisma.projectMember.create).not.toHaveBeenCalled();
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

    it('returns 404 when updating non-existing member', async () => {
      (prisma.projectMember.update as jest.Mock).mockRejectedValue({ code: 'P2025' });
      const req: any = { params: { id: 'missing' }, body: { role: 'LEAD' } };
      const res = mockRes();

      await updateProjectMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
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

    it('returns 404 when deleting non-existing member', async () => {
      (prisma.projectMember.delete as jest.Mock).mockRejectedValue({ code: 'P2025' });
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await deleteProjectMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
