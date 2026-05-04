import {
  createProjectHandler,
  getAllProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from './projects.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
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

const sampleProject = {
  id: 'proj-1',
  organizationId: 'org-1',
  name: 'Alpha Project',
  description: 'Test project',
  status: 'ACTIVE',
  startDate: null,
  endDate: null,
  budget: 5000,
  spentBudget: 0,
  progress: 0,
  clientId: null,
  managerId: null,
  teamIds: [],
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Projects Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ────────── createProjectHandler ────────── */
  describe('createProjectHandler', () => {
    it('creates project with all fields destructured properly', async () => {
      (prisma.project.create as jest.Mock).mockResolvedValue(sampleProject);
      const req: any = {
        body: {
          organizationId: 'org-1',
          name: 'Alpha Project',
          description: 'Test',
          status: 'ACTIVE',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 5000,
          spentBudget: 0,
          progress: 10,
          clientId: 'client-1',
          managerId: 'user-1',
          teamIds: ['team-1'],
          metadata: { key: 'value' },
        },
      };
      const res = mockRes();
      await createProjectHandler(req, res);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          name: 'Alpha Project',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          progress: 10,
          teamIds: ['team-1'],
        }),
      });
      expect(res.json).toHaveBeenCalledWith(sampleProject);
    });

    it('handles null dates when startDate/endDate not provided', async () => {
      (prisma.project.create as jest.Mock).mockResolvedValue(sampleProject);
      const req: any = { body: { organizationId: 'org-1', name: 'No Dates' } };
      const res = mockRes();
      await createProjectHandler(req, res);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          startDate: null,
          endDate: null,
          progress: 0,
          teamIds: [],
        }),
      });
    });

    it('returns 500 on error', async () => {
      (prisma.project.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createProjectHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create project' });
    });
  });

  /* ────────── getAllProjectsHandler ────────── */
  describe('getAllProjectsHandler', () => {
    it('returns all projects with includes and ordering', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([sampleProject]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllProjectsHandler(req, res);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ members: true }),
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(res.json).toHaveBeenCalledWith([sampleProject]);
    });

    it('filters by organizationId', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { organizationId: 'org-1' } };
      const res = mockRes();
      await getAllProjectsHandler(req, res);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1' }) }),
      );
    });

    it('filters by status', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { status: 'ACTIVE' } };
      const res = mockRes();
      await getAllProjectsHandler(req, res);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });

    it('filters by managerId and clientId', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { managerId: 'mgr-1', clientId: 'cli-1' } };
      const res = mockRes();
      await getAllProjectsHandler(req, res);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ managerId: 'mgr-1', clientId: 'cli-1' }) }),
      );
    });

    it('applies search filter with OR clause', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { search: 'alpha' } };
      const res = mockRes();
      await getAllProjectsHandler(req, res);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
      );
    });

    it('returns 500 on error', async () => {
      (prisma.project.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { query: {} };
      const res = mockRes();
      await getAllProjectsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── getProjectByIdHandler ────────── */
  describe('getProjectByIdHandler', () => {
    it('returns project with nested includes', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(sampleProject);
      const req: any = { params: { id: 'proj-1' } };
      const res = mockRes();
      await getProjectByIdHandler(req, res);
      expect(prisma.project.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1' },
          include: expect.objectContaining({
            members: true,
            tasks: expect.any(Object),
            milestones: expect.any(Object),
            risks: expect.any(Object),
            aiInsights: expect.any(Object),
          }),
        }),
      );
      expect(res.json).toHaveBeenCalledWith(sampleProject);
    });

    it('returns 404 when not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getProjectByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    });

    it('returns 500 on error', async () => {
      (prisma.project.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'proj-1' } };
      const res = mockRes();
      await getProjectByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── updateProjectHandler ────────── */
  describe('updateProjectHandler', () => {
    it('updates project and converts date strings to Date objects', async () => {
      const updated = { ...sampleProject, name: 'Beta' };
      (prisma.project.update as jest.Mock).mockResolvedValue(updated);
      const req: any = {
        params: { id: 'proj-1' },
        body: { name: 'Beta', startDate: '2025-06-01', endDate: '2025-12-31' },
      };
      const res = mockRes();
      await updateProjectHandler(req, res);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: expect.objectContaining({
          name: 'Beta',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('does not convert dates when not provided', async () => {
      const updated = { ...sampleProject, name: 'Gamma' };
      (prisma.project.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'proj-1' }, body: { name: 'Gamma' } };
      const res = mockRes();
      await updateProjectHandler(req, res);
      const passedData = (prisma.project.update as jest.Mock).mock.calls[0][0].data;
      expect(passedData.startDate).toBeUndefined();
    });

    it('returns 500 on error', async () => {
      (prisma.project.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'proj-1' }, body: {} };
      const res = mockRes();
      await updateProjectHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── deleteProjectHandler ────────── */
  describe('deleteProjectHandler', () => {
    it('deletes project and returns success', async () => {
      (prisma.project.delete as jest.Mock).mockResolvedValue(sampleProject);
      const req: any = { params: { id: 'proj-1' } };
      const res = mockRes();
      await deleteProjectHandler(req, res);
      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Project deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.project.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'proj-1' } };
      const res = mockRes();
      await deleteProjectHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
