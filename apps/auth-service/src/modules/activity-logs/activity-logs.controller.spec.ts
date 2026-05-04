import {
  createActivityLogHandler,
  getAllActivityLogsHandler,
  getActivityLogByIdHandler,
} from './activity-logs.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

const sampleLog = {
  id: 'log-1',
  userId: 'user-1',
  action: 'LOGIN',
  resource: 'auth',
  resourceId: null,
  metadata: null,
  createdAt: new Date(),
};

describe('ActivityLogs Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createActivityLogHandler', () => {
    it('creates and returns an activity log', async () => {
      (prisma.activityLog.create as jest.Mock).mockResolvedValue(sampleLog);
      const req: any = { body: { userId: 'user-1', action: 'LOGIN' } };
      const res = mockRes();

      await createActivityLogHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleLog);
    });

    it('returns 500 on error', async () => {
      (prisma.activityLog.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createActivityLogHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllActivityLogsHandler', () => {
    it('returns all activity logs', async () => {
      (prisma.activityLog.findMany as jest.Mock).mockResolvedValue([sampleLog]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllActivityLogsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleLog]);
    });

    it('applies userId filter when provided', async () => {
      (prisma.activityLog.findMany as jest.Mock).mockResolvedValue([sampleLog]);
      const req: any = { query: { userId: 'user-1' } };
      const res = mockRes();

      await getAllActivityLogsHandler(req, res);

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        })
      );
    });
  });

  describe('getActivityLogByIdHandler', () => {
    it('returns log by id', async () => {
      (prisma.activityLog.findUnique as jest.Mock).mockResolvedValue(sampleLog);
      const req: any = { params: { id: 'log-1' } };
      const res = mockRes();

      await getActivityLogByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleLog);
    });

    it('returns 404 when not found', async () => {
      (prisma.activityLog.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getActivityLogByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
