import {
  createMemberPerformanceHandler,
  getAllMemberPerformancesHandler,
  getMemberPerformanceByIdHandler,
} from './member-performance.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    memberPerformance: {
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

const sample = { id: 'mp-1', userId: 'u1', score: 95 };

describe('MemberPerformance Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createMemberPerformanceHandler', () => {
    it('creates and returns performance record', async () => {
      (prisma.memberPerformance.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { userId: 'u1', score: 95 } };
      const res = mockRes();
      await createMemberPerformanceHandler(req, res);
      expect(prisma.memberPerformance.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.memberPerformance.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createMemberPerformanceHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create member performance' });
    });
  });

  describe('getAllMemberPerformancesHandler', () => {
    it('returns all records', async () => {
      (prisma.memberPerformance.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllMemberPerformancesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.memberPerformance.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllMemberPerformancesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMemberPerformanceByIdHandler', () => {
    it('returns record by id', async () => {
      (prisma.memberPerformance.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'mp-1' } };
      const res = mockRes();
      await getMemberPerformanceByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.memberPerformance.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getMemberPerformanceByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.memberPerformance.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'mp-1' } };
      const res = mockRes();
      await getMemberPerformanceByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
