import {
  createReportScheduleHandler,
  getAllReportSchedulesHandler,
  getReportScheduleByIdHandler,
  updateReportScheduleHandler,
  deleteReportScheduleHandler,
} from './report-schedules.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    reportSchedule: {
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

const sample = { id: 'rs-1', organizationId: 'org-1', frequency: 'weekly', isActive: true };

describe('ReportSchedules Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createReportScheduleHandler', () => {
    it('creates and returns schedule', async () => {
      (prisma.reportSchedule.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { organizationId: 'org-1', frequency: 'weekly' } };
      const res = mockRes();
      await createReportScheduleHandler(req, res);
      expect(prisma.reportSchedule.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.reportSchedule.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createReportScheduleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllReportSchedulesHandler', () => {
    it('returns all schedules without filters', async () => {
      (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllReportSchedulesHandler(req, res);
      expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('filters by organizationId', async () => {
      (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: { organizationId: 'org-1' } };
      const res = mockRes();
      await getAllReportSchedulesHandler(req, res);
      expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by isActive=true', async () => {
      (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: { isActive: 'true' } };
      const res = mockRes();
      await getAllReportSchedulesHandler(req, res);
      expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by isActive=false', async () => {
      (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { isActive: 'false' } };
      const res = mockRes();
      await getAllReportSchedulesHandler(req, res);
      expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith({
        where: { isActive: false },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('combines organizationId and isActive filters', async () => {
      (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { organizationId: 'org-1', isActive: 'true' } };
      const res = mockRes();
      await getAllReportSchedulesHandler(req, res);
      expect(prisma.reportSchedule.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns 500 on error', async () => {
      (prisma.reportSchedule.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { query: {} };
      const res = mockRes();
      await getAllReportSchedulesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getReportScheduleByIdHandler', () => {
    it('returns schedule by id', async () => {
      (prisma.reportSchedule.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'rs-1' } };
      const res = mockRes();
      await getReportScheduleByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.reportSchedule.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getReportScheduleByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.reportSchedule.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'rs-1' } };
      const res = mockRes();
      await getReportScheduleByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateReportScheduleHandler', () => {
    it('updates and returns schedule', async () => {
      const updated = { ...sample, frequency: 'daily' };
      (prisma.reportSchedule.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'rs-1' }, body: { frequency: 'daily' } };
      const res = mockRes();
      await updateReportScheduleHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.reportSchedule.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'rs-1' }, body: {} };
      const res = mockRes();
      await updateReportScheduleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteReportScheduleHandler', () => {
    it('deletes and returns success', async () => {
      (prisma.reportSchedule.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'rs-1' } };
      const res = mockRes();
      await deleteReportScheduleHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Report schedule deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.reportSchedule.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'rs-1' } };
      const res = mockRes();
      await deleteReportScheduleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
