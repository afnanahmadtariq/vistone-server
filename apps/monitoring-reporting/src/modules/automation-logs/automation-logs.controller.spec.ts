import {
  createAutomationLogHandler,
  getAllAutomationLogsHandler,
  getAutomationLogByIdHandler,
} from './automation-logs.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    automationLog: {
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

const sample = { id: 'al-1', automationId: 'auto-1', status: 'success' };

describe('AutomationLogs Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createAutomationLogHandler', () => {
    it('creates and returns log', async () => {
      (prisma.automationLog.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { automationId: 'auto-1', status: 'success' } };
      const res = mockRes();
      await createAutomationLogHandler(req, res);
      expect(prisma.automationLog.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.automationLog.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createAutomationLogHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create automation log' });
    });
  });

  describe('getAllAutomationLogsHandler', () => {
    it('returns all logs', async () => {
      (prisma.automationLog.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllAutomationLogsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.automationLog.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllAutomationLogsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAutomationLogByIdHandler', () => {
    it('returns log by id', async () => {
      (prisma.automationLog.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'al-1' } };
      const res = mockRes();
      await getAutomationLogByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.automationLog.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getAutomationLogByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.automationLog.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'al-1' } };
      const res = mockRes();
      await getAutomationLogByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
