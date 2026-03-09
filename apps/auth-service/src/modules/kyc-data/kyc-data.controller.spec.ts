import {
  createKycDataHandler,
  getAllKycDataHandler,
  getKycDataByIdHandler,
  updateKycDataHandler,
  deleteKycDataHandler,
} from './kyc-data.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    kycData: {
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

const sampleKyc = {
  id: 'kyc-1',
  userId: 'user-1',
  documentType: 'passport',
  documentNumber: 'P123456',
  verifiedAt: null,
  createdAt: new Date(),
};

describe('KycData Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createKycDataHandler', () => {
    it('creates and returns KYC data', async () => {
      (prisma.kycData.create as jest.Mock).mockResolvedValue(sampleKyc);
      const req: any = { body: { userId: 'user-1', documentType: 'passport' } };
      const res = mockRes();

      await createKycDataHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleKyc);
    });

    it('returns 500 on error', async () => {
      (prisma.kycData.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createKycDataHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllKycDataHandler', () => {
    it('returns all KYC records', async () => {
      (prisma.kycData.findMany as jest.Mock).mockResolvedValue([sampleKyc]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllKycDataHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleKyc]);
    });
  });

  describe('getKycDataByIdHandler', () => {
    it('returns KYC record by id', async () => {
      (prisma.kycData.findUnique as jest.Mock).mockResolvedValue(sampleKyc);
      const req: any = { params: { id: 'kyc-1' } };
      const res = mockRes();

      await getKycDataByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleKyc);
    });

    it('returns 404 when not found', async () => {
      (prisma.kycData.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getKycDataByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateKycDataHandler', () => {
    it('updates and returns KYC data', async () => {
      const updated = { ...sampleKyc, documentNumber: 'P999' };
      (prisma.kycData.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'kyc-1' }, body: { documentNumber: 'P999' } };
      const res = mockRes();

      await updateKycDataHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteKycDataHandler', () => {
    it('deletes KYC data and returns success', async () => {
      (prisma.kycData.delete as jest.Mock).mockResolvedValue(sampleKyc);
      const req: any = { params: { id: 'kyc-1' } };
      const res = mockRes();

      await deleteKycDataHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
