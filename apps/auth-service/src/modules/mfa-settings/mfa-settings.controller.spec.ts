import {
  createMfaSettingHandler,
  getAllMfaSettingsHandler,
  getMfaSettingByIdHandler,
  updateMfaSettingHandler,
  deleteMfaSettingHandler,
} from './mfa-settings.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    mfaSetting: {
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

const sampleMfa = {
  id: 'mfa-1',
  userId: 'user-1',
  method: 'totp',
  enabled: true,
  createdAt: new Date(),
};

describe('MfaSettings Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createMfaSettingHandler', () => {
    it('creates and returns MFA setting', async () => {
      (prisma.mfaSetting.create as jest.Mock).mockResolvedValue(sampleMfa);
      const req: any = { body: { userId: 'user-1', method: 'totp' } };
      const res = mockRes();

      await createMfaSettingHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleMfa);
    });

    it('returns 500 on error', async () => {
      (prisma.mfaSetting.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createMfaSettingHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllMfaSettingsHandler', () => {
    it('returns all MFA settings', async () => {
      (prisma.mfaSetting.findMany as jest.Mock).mockResolvedValue([sampleMfa]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllMfaSettingsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleMfa]);
    });
  });

  describe('getMfaSettingByIdHandler', () => {
    it('returns MFA setting by id', async () => {
      (prisma.mfaSetting.findUnique as jest.Mock).mockResolvedValue(sampleMfa);
      const req: any = { params: { id: 'mfa-1' } };
      const res = mockRes();

      await getMfaSettingByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleMfa);
    });

    it('returns 404 when not found', async () => {
      (prisma.mfaSetting.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getMfaSettingByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMfaSettingHandler', () => {
    it('updates and returns MFA setting', async () => {
      const updated = { ...sampleMfa, enabled: false };
      (prisma.mfaSetting.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'mfa-1' }, body: { enabled: false } };
      const res = mockRes();

      await updateMfaSettingHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteMfaSettingHandler', () => {
    it('deletes MFA setting and returns success', async () => {
      (prisma.mfaSetting.delete as jest.Mock).mockResolvedValue(sampleMfa);
      const req: any = { params: { id: 'mfa-1' } };
      const res = mockRes();

      await deleteMfaSettingHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
