import {
  createDashboardHandler,
  getAllDashboardsHandler,
  getDashboardByIdHandler,
  updateDashboardHandler,
  deleteDashboardHandler,
} from './dashboards.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    dashboard: {
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

const sample = { id: 'dash-1', organizationId: 'org-1', name: 'Operations Dashboard', userId: 'user-1', isDefault: false, createdAt: new Date() };

describe('Dashboards Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDashboardHandler', () => {
    it('creates and returns a dashboard', async () => {
      (prisma.dashboard.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { organizationId: 'org-1', name: 'Operations Dashboard' } };
      const res = mockRes();
      await createDashboardHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.dashboard.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createDashboardHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllDashboardsHandler', () => {
    it('returns all dashboards', async () => {
      (prisma.dashboard.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllDashboardsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getDashboardByIdHandler', () => {
    it('returns dashboard by id', async () => {
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'dash-1' } };
      const res = mockRes();
      await getDashboardByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getDashboardByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateDashboardHandler', () => {
    it('updates and returns dashboard', async () => {
      const updated = { ...sample, name: 'Updated Dashboard' };
      (prisma.dashboard.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'dash-1' }, body: { name: 'Updated Dashboard' } };
      const res = mockRes();
      await updateDashboardHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteDashboardHandler', () => {
    it('deletes dashboard and returns success', async () => {
      (prisma.dashboard.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'dash-1' } };
      const res = mockRes();
      await deleteDashboardHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
