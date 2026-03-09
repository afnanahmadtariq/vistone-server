import {
  createDashboardWidgetHandler,
  getAllDashboardWidgetsHandler,
  getDashboardWidgetByIdHandler,
  updateDashboardWidgetHandler,
  deleteDashboardWidgetHandler,
} from './dashboard-widgets.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    dashboardWidget: {
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

const sample = { id: 'dw-1', title: 'Revenue Chart', type: 'bar' };

describe('DashboardWidgets Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDashboardWidgetHandler', () => {
    it('creates and returns widget', async () => {
      (prisma.dashboardWidget.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { title: 'Revenue Chart', type: 'bar' } };
      const res = mockRes();
      await createDashboardWidgetHandler(req, res);
      expect(prisma.dashboardWidget.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.dashboardWidget.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createDashboardWidgetHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create dashboard widget' });
    });
  });

  describe('getAllDashboardWidgetsHandler', () => {
    it('returns all widgets', async () => {
      (prisma.dashboardWidget.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllDashboardWidgetsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.dashboardWidget.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllDashboardWidgetsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDashboardWidgetByIdHandler', () => {
    it('returns widget by id', async () => {
      (prisma.dashboardWidget.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'dw-1' } };
      const res = mockRes();
      await getDashboardWidgetByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.dashboardWidget.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getDashboardWidgetByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.dashboardWidget.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'dw-1' } };
      const res = mockRes();
      await getDashboardWidgetByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateDashboardWidgetHandler', () => {
    it('updates and returns widget', async () => {
      const updated = { ...sample, title: 'New Title' };
      (prisma.dashboardWidget.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'dw-1' }, body: { title: 'New Title' } };
      const res = mockRes();
      await updateDashboardWidgetHandler(req, res);
      expect(prisma.dashboardWidget.update).toHaveBeenCalledWith({ where: { id: 'dw-1' }, data: req.body });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.dashboardWidget.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'dw-1' }, body: {} };
      const res = mockRes();
      await updateDashboardWidgetHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteDashboardWidgetHandler', () => {
    it('deletes and returns success', async () => {
      (prisma.dashboardWidget.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'dw-1' } };
      const res = mockRes();
      await deleteDashboardWidgetHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Dashboard widget deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.dashboardWidget.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'dw-1' } };
      const res = mockRes();
      await deleteDashboardWidgetHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
