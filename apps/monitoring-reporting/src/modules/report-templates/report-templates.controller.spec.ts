import {
  createReportTemplateHandler,
  getAllReportTemplatesHandler,
  getReportTemplateByIdHandler,
  updateReportTemplateHandler,
  deleteReportTemplateHandler,
} from './report-templates.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    reportTemplate: {
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

const sample = { id: 'rt-1', organizationId: 'org-1', name: 'Monthly Progress', type: 'PROJECT', config: {}, createdAt: new Date() };

describe('ReportTemplates Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createReportTemplateHandler', () => {
    it('creates and returns a report template', async () => {
      (prisma.reportTemplate.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { organizationId: 'org-1', name: 'Monthly Progress', type: 'PROJECT' } };
      const res = mockRes();
      await createReportTemplateHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.reportTemplate.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createReportTemplateHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllReportTemplatesHandler', () => {
    it('returns all report templates', async () => {
      (prisma.reportTemplate.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllReportTemplatesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getReportTemplateByIdHandler', () => {
    it('returns template by id', async () => {
      (prisma.reportTemplate.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'rt-1' } };
      const res = mockRes();
      await getReportTemplateByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.reportTemplate.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getReportTemplateByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateReportTemplateHandler', () => {
    it('updates and returns template', async () => {
      const updated = { ...sample, name: 'Updated Template' };
      (prisma.reportTemplate.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'rt-1' }, body: { name: 'Updated Template' } };
      const res = mockRes();
      await updateReportTemplateHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteReportTemplateHandler', () => {
    it('deletes template and returns success', async () => {
      (prisma.reportTemplate.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'rt-1' } };
      const res = mockRes();
      await deleteReportTemplateHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
