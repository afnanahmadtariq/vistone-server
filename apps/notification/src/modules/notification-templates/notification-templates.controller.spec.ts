import {
  createNotificationTemplateHandler,
  getAllNotificationTemplatesHandler,
  getNotificationTemplateByIdHandler,
  updateNotificationTemplateHandler,
  deleteNotificationTemplateHandler,
} from './notification-templates.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    notificationTemplate: {
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
  id: 'nt-1',
  name: 'task_assigned',
  subject: 'New Task Assigned',
  body: 'Hello {{name}}, you have a new task.',
  channel: 'EMAIL',
  createdAt: new Date(),
};

describe('NotificationTemplates Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createNotificationTemplateHandler', () => {
    it('creates and returns a template', async () => {
      (prisma.notificationTemplate.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { name: 'task_assigned', subject: 'New Task', body: '...' } };
      const res = mockRes();
      await createNotificationTemplateHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.notificationTemplate.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createNotificationTemplateHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllNotificationTemplatesHandler', () => {
    it('returns all templates', async () => {
      (prisma.notificationTemplate.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllNotificationTemplatesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getNotificationTemplateByIdHandler', () => {
    it('returns template by id', async () => {
      (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'nt-1' } };
      const res = mockRes();
      await getNotificationTemplateByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getNotificationTemplateByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateNotificationTemplateHandler', () => {
    it('updates and returns template', async () => {
      const updated = { ...sample, subject: 'Updated Subject' };
      (prisma.notificationTemplate.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'nt-1' }, body: { subject: 'Updated Subject' } };
      const res = mockRes();
      await updateNotificationTemplateHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteNotificationTemplateHandler', () => {
    it('deletes template and returns success', async () => {
      (prisma.notificationTemplate.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'nt-1' } };
      const res = mockRes();
      await deleteNotificationTemplateHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
