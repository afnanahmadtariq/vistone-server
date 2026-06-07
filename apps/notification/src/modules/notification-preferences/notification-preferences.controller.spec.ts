import {
  createNotificationPreferenceHandler,
  getAllNotificationPreferencesHandler,
  getNotificationPreferenceByIdHandler,
  updateNotificationPreferenceHandler,
  deleteNotificationPreferenceHandler,
} from './notification-preferences.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    notificationPreference: {
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

const sample = { id: 'np-1', userId: 'u1', channel: 'email', enabled: true };

describe('NotificationPreferences Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createNotificationPreferenceHandler', () => {
    it('creates and returns preference', async () => {
      (prisma.notificationPreference.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { userId: 'u1', channel: 'email', enabled: true } };
      const res = mockRes();
      await createNotificationPreferenceHandler(req, res);
      expect(prisma.notificationPreference.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.notificationPreference.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createNotificationPreferenceHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create notification preference' });
    });
  });

  describe('getAllNotificationPreferencesHandler', () => {
    it('returns all preferences', async () => {
      (prisma.notificationPreference.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllNotificationPreferencesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.notificationPreference.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllNotificationPreferencesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getNotificationPreferenceByIdHandler', () => {
    it('returns preference by id', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'np-1' } };
      const res = mockRes();
      await getNotificationPreferenceByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getNotificationPreferenceByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'np-1' } };
      const res = mockRes();
      await getNotificationPreferenceByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateNotificationPreferenceHandler', () => {
    it('updates and returns preference', async () => {
      const updated = { ...sample, enabled: false };
      (prisma.notificationPreference.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'np-1' }, body: { enabled: false } };
      const res = mockRes();
      await updateNotificationPreferenceHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.notificationPreference.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'np-1' }, body: {} };
      const res = mockRes();
      await updateNotificationPreferenceHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteNotificationPreferenceHandler', () => {
    it('deletes and returns success', async () => {
      (prisma.notificationPreference.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'np-1' } };
      const res = mockRes();
      await deleteNotificationPreferenceHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Notification preference deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.notificationPreference.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'np-1' } };
      const res = mockRes();
      await deleteNotificationPreferenceHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
