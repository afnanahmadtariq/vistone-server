import {
  createKpiDefinitionHandler,
  getAllKpiDefinitionsHandler,
  getKpiDefinitionByIdHandler,
  updateKpiDefinitionHandler,
  deleteKpiDefinitionHandler,
} from './kpi-definitions.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    kpiDefinition: {
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
  id: 'kpi-1',
  organizationId: 'org-1',
  name: 'Bug Resolution Time',
  unit: 'hours',
  target: 24,
  category: 'QUALITY',
  createdAt: new Date(),
};

describe('KpiDefinitions Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createKpiDefinitionHandler', () => {
    it('creates and returns a KPI definition', async () => {
      (prisma.kpiDefinition.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { organizationId: 'org-1', name: 'Bug Resolution Time' } };
      const res = mockRes();
      await createKpiDefinitionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.kpiDefinition.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createKpiDefinitionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllKpiDefinitionsHandler', () => {
    it('returns all KPI definitions', async () => {
      (prisma.kpiDefinition.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllKpiDefinitionsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getKpiDefinitionByIdHandler', () => {
    it('returns KPI definition by id', async () => {
      (prisma.kpiDefinition.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'kpi-1' } };
      const res = mockRes();
      await getKpiDefinitionByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.kpiDefinition.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getKpiDefinitionByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateKpiDefinitionHandler', () => {
    it('updates and returns KPI definition', async () => {
      const updated = { ...sample, target: 48 };
      (prisma.kpiDefinition.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'kpi-1' }, body: { target: 48 } };
      const res = mockRes();
      await updateKpiDefinitionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteKpiDefinitionHandler', () => {
    it('deletes KPI definition and returns success', async () => {
      (prisma.kpiDefinition.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'kpi-1' } };
      const res = mockRes();
      await deleteKpiDefinitionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
