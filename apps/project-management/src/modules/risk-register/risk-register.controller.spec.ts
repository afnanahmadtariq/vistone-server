import {
  createRiskRegisterHandler,
  getAllRiskRegistersHandler,
  getRiskRegisterByIdHandler,
  updateRiskRegisterHandler,
  deleteRiskRegisterHandler,
} from './risk-register.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    riskRegister: {
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

const sampleRisk = {
  id: 'risk-1',
  projectId: 'proj-1',
  title: 'Scope Creep',
  description: 'Requirements expanding without control',
  impact: 'HIGH',
  probability: 'MEDIUM',
  status: 'OPEN',
  mitigationPlan: null,
  createdAt: new Date(),
};

describe('RiskRegister Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createRiskHandler', () => {
    it('creates and returns a risk', async () => {
      (prisma.riskRegister.create as jest.Mock).mockResolvedValue(sampleRisk);
      const req: any = { body: { projectId: 'proj-1', title: 'Scope Creep', impact: 'HIGH', probability: 'MEDIUM' } };
      const res = mockRes();

      await createRiskRegisterHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleRisk);
    });

    it('returns 500 on error', async () => {
      (prisma.riskRegister.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createRiskRegisterHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllRisksHandler', () => {
    it('returns all risks', async () => {
      (prisma.riskRegister.findMany as jest.Mock).mockResolvedValue([sampleRisk]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllRiskRegistersHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleRisk]);
    });
  });

  describe('getRiskByIdHandler', () => {
    it('returns risk when found', async () => {
      (prisma.riskRegister.findUnique as jest.Mock).mockResolvedValue(sampleRisk);
      const req: any = { params: { id: 'risk-1' } };
      const res = mockRes();

      await getRiskRegisterByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleRisk);
    });

    it('returns 404 when not found', async () => {
      (prisma.riskRegister.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getRiskRegisterByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateRiskHandler', () => {
    it('updates and returns risk', async () => {
      const updated = { ...sampleRisk, status: 'MITIGATED' };
      (prisma.riskRegister.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'risk-1' }, body: { status: 'MITIGATED' } };
      const res = mockRes();

      await updateRiskRegisterHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteRiskHandler', () => {
    it('deletes risk and returns success', async () => {
      (prisma.riskRegister.delete as jest.Mock).mockResolvedValue(sampleRisk);
      const req: any = { params: { id: 'risk-1' } };
      const res = mockRes();

      await deleteRiskRegisterHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
