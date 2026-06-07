import {
  createGeneratedReportHandler,
  getAllGeneratedReportsHandler,
  getGeneratedReportByIdHandler,
} from './generated-reports.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    generatedReport: {
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

const sample = { id: 'gr-1', title: 'Monthly Report', format: 'pdf' };

describe('GeneratedReports Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createGeneratedReportHandler', () => {
    it('creates and returns report', async () => {
      (prisma.generatedReport.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { title: 'Monthly Report', format: 'pdf' } };
      const res = mockRes();
      await createGeneratedReportHandler(req, res);
      expect(prisma.generatedReport.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.generatedReport.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createGeneratedReportHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create generated report' });
    });
  });

  describe('getAllGeneratedReportsHandler', () => {
    it('returns all reports', async () => {
      (prisma.generatedReport.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllGeneratedReportsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.generatedReport.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllGeneratedReportsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getGeneratedReportByIdHandler', () => {
    it('returns report by id', async () => {
      (prisma.generatedReport.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'gr-1' } };
      const res = mockRes();
      await getGeneratedReportByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.generatedReport.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getGeneratedReportByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.generatedReport.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'gr-1' } };
      const res = mockRes();
      await getGeneratedReportByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
