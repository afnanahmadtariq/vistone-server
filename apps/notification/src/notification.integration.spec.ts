/**
 * Notification Service – Integration Tests
 */
jest.mock('./lib/email', () => ({
  __esModule: true,
  sendEmail: jest.fn().mockResolvedValue(true),
  emailTemplates: {
    organizationInvite: jest.fn().mockReturnValue({ subject: 'test', html: '<p>test</p>' }),
    clientPortalInvite: jest.fn().mockReturnValue({ subject: 'test', html: '<p>test</p>' }),
  },
}));

jest.mock('./lib/prisma', () => ({
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
    notificationTemplate: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    notificationPreference: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    email: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const notification = {
  id: 'notif-1',
  userId: 'user-1',
  title: 'New Task',
  message: 'You have a new task',
  read: false,
  type: 'TASK_ASSIGNED',
  createdAt: new Date().toISOString(),
};
const template = {
  id: 'nt-1',
  name: 'task_assigned',
  subject: 'New Task',
  body: 'Hello {{name}}',
  channel: 'EMAIL',
  createdAt: new Date().toISOString(),
};
const preference = {
  id: 'pref-1',
  userId: 'user-1',
  channel: 'EMAIL',
  enabled: true,
  createdAt: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ── Notifications ─────────────────────────────────────────────
describe('GET /notifications', () => {
  it('returns 200 with notifications array', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([notification]);
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /notifications', () => {
  it('creates a notification', async () => {
    (prisma.notification.create as jest.Mock).mockResolvedValue(notification);
    const res = await request(app).post('/notifications').send({
      userId: 'user-1',
      title: 'New Task',
      message: 'You have a new task',
      type: 'TASK_ASSIGNED',
    });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /notifications/:id', () => {
  it('returns 200 when notification exists', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(notification);
    const res = await request(app).get('/notifications/notif-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/notifications/missing');
    expect(res.status).toBe(404);
  });
});

describe('PUT /notifications/:id', () => {
  it('marks notification as read', async () => {
    (prisma.notification.update as jest.Mock).mockResolvedValue({ ...notification, read: true });
    const res = await request(app).put('/notifications/notif-1').send({ read: true });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /notifications/:id', () => {
  it('deletes notification', async () => {
    (prisma.notification.delete as jest.Mock).mockResolvedValue(notification);
    const res = await request(app).delete('/notifications/notif-1');
    expect(res.status).toBe(200);
  });
});

describe('GET /notifications/user/:userId', () => {
  it('returns user notifications', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([notification]);
    const res = await request(app).get('/notifications/user/user-1');
    expect(res.status).toBe(200);
  });
});

describe('PUT /notifications/user/:userId/read-all', () => {
  it('marks all as read', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await request(app).put('/notifications/user/user-1/read-all');
    expect(res.status).toBe(200);
  });
});

// ── Notification Templates ─────────────────────────────────────
describe('GET /notification-templates', () => {
  it('returns 200', async () => {
    (prisma.notificationTemplate.findMany as jest.Mock).mockResolvedValue([template]);
    const res = await request(app).get('/notification-templates');
    expect(res.status).toBe(200);
  });
});

describe('POST /notification-templates', () => {
  it('creates a template', async () => {
    (prisma.notificationTemplate.create as jest.Mock).mockResolvedValue(template);
    const res = await request(app)
      .post('/notification-templates')
      .send({ name: 'task_assigned', subject: 'New Task', body: 'Hello {{name}}', channel: 'EMAIL' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /notification-templates/:id', () => {
  it('returns 200 when template exists', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(template);
    const res = await request(app).get('/notification-templates/nt-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.notificationTemplate.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/notification-templates/missing');
    expect(res.status).toBe(404);
  });
});

// ── Notification Preferences ───────────────────────────────────
describe('GET /notification-preferences', () => {
  it('returns 200', async () => {
    (prisma.notificationPreference.findMany as jest.Mock).mockResolvedValue([preference]);
    const res = await request(app).get('/notification-preferences');
    expect(res.status).toBe(200);
  });
});

describe('POST /notification-preferences', () => {
  it('creates a preference', async () => {
    (prisma.notificationPreference.create as jest.Mock).mockResolvedValue(preference);
    const res = await request(app).post('/notification-preferences').send({ userId: 'user-1', channel: 'EMAIL', enabled: true });
    expect([200, 201]).toContain(res.status);
  });
});
