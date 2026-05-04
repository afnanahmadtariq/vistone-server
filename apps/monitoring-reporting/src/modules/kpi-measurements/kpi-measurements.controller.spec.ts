import {
  createKpiMeasurementHandler,
  getAllKpiMeasurementsHandler,
  getKpiMeasurementByIdHandler,
} from './kpi-measurements.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    kpiMeasurement: {
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

const sample = { id: 'kpi-1', kpiDefinitionId: 'def-1', value: 42 };

describe('KpiMeasurements Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createKpiMeasurementHandler', () => {
    it('creates and returns measurement', async () => {
      (prisma.kpiMeasurement.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { kpiDefinitionId: 'def-1', value: 42 } };
      const res = mockRes();
      await createKpiMeasurementHandler(req, res);
      expect(prisma.kpiMeasurement.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.kpiMeasurement.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createKpiMeasurementHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create KPI measurement' });
    });
  });

  describe('getAllKpiMeasurementsHandler', () => {
    it('returns all measurements', async () => {
      (prisma.kpiMeasurement.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllKpiMeasurementsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.kpiMeasurement.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllKpiMeasurementsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getKpiMeasurementByIdHandler', () => {
    it('returns measurement by id', async () => {
      (prisma.kpiMeasurement.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'kpi-1' } };
      const res = mockRes();
      await getKpiMeasurementByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.kpiMeasurement.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getKpiMeasurementByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.kpiMeasurement.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'kpi-1' } };
      const res = mockRes();
      await getKpiMeasurementByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
