import {
  createNotificationHandler,
  getAllNotificationsHandler,
  getNotificationByIdHandler,
  updateNotificationMarkAsReadEtcHandler,
  deleteNotificationHandler,
  getNotificationsByUserHandler,
  markAllNotificationsAsReadForUserHandler,
} from './notifications.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  id: 'notif-1',
  userId: 'user-1',
  title: 'New Assignment',
  message: 'You have been assigned to a task',
  read: false,
  type: 'TASK_ASSIGNED',
  createdAt: new Date(),
};

describe('Notifications Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createNotificationHandler', () => {
    it('creates and returns a notification', async () => {
      (prisma.notification.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { userId: 'user-1', title: 'New Assignment', message: 'You have been assigned...' } };
      const res = mockRes();
      await createNotificationHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.notification.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createNotificationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllNotificationsHandler', () => {
    it('returns all notifications', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllNotificationsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getNotificationByIdHandler', () => {
    it('returns notification by id', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'notif-1' } };
      const res = mockRes();
      await getNotificationByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getNotificationByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateNotificationMarkAsReadEtcHandler', () => {
    it('marks notification as read', async () => {
      const updated = { ...sample, isRead: true };
      (prisma.notification.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'notif-1' }, body: { isRead: true } };
      const res = mockRes();
      await updateNotificationMarkAsReadEtcHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteNotificationHandler', () => {
    it('deletes notification and returns success', async () => {
      (prisma.notification.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'notif-1' } };
      const res = mockRes();
      await deleteNotificationHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getNotificationsByUserHandler', () => {
    it('returns notifications for a user', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { params: { userId: 'user-1' } };
      const res = mockRes();
      await getNotificationsByUserHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('markAllNotificationsAsReadForUserHandler', () => {
    it('marks all notifications read for a user', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      const req: any = { params: { userId: 'user-1' } };
      const res = mockRes();
      await markAllNotificationsAsReadForUserHandler(req, res);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1', isRead: false }) })
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'All notifications marked as read' });
    });
  });
});
