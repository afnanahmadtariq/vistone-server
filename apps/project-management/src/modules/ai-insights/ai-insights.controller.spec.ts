import {
  createAiInsightHandler,
  getAllAiInsightsHandler,
  getAiInsightByIdHandler,
  updateAiInsightHandler,
  deleteAiInsightHandler,
} from './ai-insights.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    aiInsight: {
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
  id: 'insight-1',
  projectId: 'proj-1',
  type: 'RISK_ALERT',
  content: 'Deadline at risk',
  metadata: null,
  createdAt: new Date(),
};

describe('AiInsights Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createAiInsightHandler', () => {
    it('creates and returns an AI insight', async () => {
      (prisma.aiInsight.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { projectId: 'proj-1', type: 'RISK_ALERT', content: 'Deadline at risk' } };
      const res = mockRes();

      await createAiInsightHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.aiInsight.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createAiInsightHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllAiInsightsHandler', () => {
    it('returns all insights', async () => {
      (prisma.aiInsight.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllAiInsightsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getAiInsightByIdHandler', () => {
    it('returns insight by id', async () => {
      (prisma.aiInsight.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'insight-1' } };
      const res = mockRes();

      await getAiInsightByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.aiInsight.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getAiInsightByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateAiInsightHandler', () => {
    it('updates and returns insight', async () => {
      const updated = { ...sample, content: 'Updated' };
      (prisma.aiInsight.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'insight-1' }, body: { content: 'Updated' } };
      const res = mockRes();

      await updateAiInsightHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteAiInsightHandler', () => {
    it('deletes insight and returns success', async () => {
      (prisma.aiInsight.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'insight-1' } };
      const res = mockRes();

      await deleteAiInsightHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
