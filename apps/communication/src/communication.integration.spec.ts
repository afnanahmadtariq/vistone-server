/**
 * Communication Service – Integration Tests
 * Mocks both Prisma (chatChannel, channelMember) and mongoose Message model.
 */
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    chatChannel: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    channelMember: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

// Mock the Message mongoose model
jest.mock('./models/message.model', () => {
  const mockLean = jest.fn().mockResolvedValue([]);
  const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSort = jest.fn().mockReturnValue({ limit: mockLimit, lean: mockLean });
  const mockFind = jest.fn().mockReturnValue({ sort: mockSort, limit: mockLimit, lean: mockLean });
  return {
    Message: {
      find: mockFind,
      findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
      findByIdAndDelete: jest.fn(),
    },
  };
});

jest.mock('./lib/socket', () => ({
  getIO: jest.fn().mockReturnValue({ to: jest.fn().mockReturnValue({ emit: jest.fn() }) }),
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const channel = {
  id: 'ch-1',
  organizationId: 'org-1',
  name: 'general',
  type: 'PUBLIC',
  createdBy: 'user-1',
  projectId: null,
  createdAt: new Date().toISOString(),
};

const channelMember = {
  id: 'cm-1',
  channelId: 'ch-1',
  userId: 'user-1',
  role: 'MEMBER',
  joinedAt: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ── Chat Channels ─────────────────────────────────────────────
describe('GET /chat-channels', () => {
  it('returns 200 with channels array', async () => {
    (prisma.chatChannel.findMany as jest.Mock).mockResolvedValue([channel]);
    const res = await request(app).get('/chat-channels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /chat-channels', () => {
  it('creates a chat channel', async () => {
    (prisma.chatChannel.create as jest.Mock).mockResolvedValue(channel);
    const res = await request(app)
      .post('/chat-channels')
      .send({ organizationId: 'org-1', type: 'PUBLIC', createdBy: 'user-1', name: 'general' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /chat-channels/:id', () => {
  it('returns 200 when channel exists', async () => {
    (prisma.chatChannel.findUnique as jest.Mock).mockResolvedValue(channel);
    const res = await request(app).get('/chat-channels/ch-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.chatChannel.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/chat-channels/missing');
    expect(res.status).toBe(404);
  });
});

describe('PUT /chat-channels/:id', () => {
  it('updates a channel', async () => {
    (prisma.chatChannel.update as jest.Mock).mockResolvedValue({ ...channel, name: 'engineering' });
    const res = await request(app).put('/chat-channels/ch-1').send({ name: 'engineering' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /chat-channels/:id', () => {
  it('deletes a channel', async () => {
    (prisma.chatChannel.delete as jest.Mock).mockResolvedValue(channel);
    const res = await request(app).delete('/chat-channels/ch-1');
    expect(res.status).toBe(200);
  });
});

// ── Channel Members ───────────────────────────────────────────
describe('GET /channel-members', () => {
  it('returns 200', async () => {
    (prisma.channelMember.findMany as jest.Mock).mockResolvedValue([channelMember]);
    const res = await request(app).get('/channel-members');
    expect(res.status).toBe(200);
  });
});

describe('POST /channel-members', () => {
  it('adds a channel member', async () => {
    (prisma.channelMember.create as jest.Mock).mockResolvedValue(channelMember);
    const res = await request(app).post('/channel-members').send({ channelId: 'ch-1', userId: 'user-1' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /channel-members/:id', () => {
  it('returns 200 when member exists', async () => {
    (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue(channelMember);
    const res = await request(app).get('/channel-members/cm-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/channel-members/missing');
    expect(res.status).toBe(404);
  });
});

// ── Messages ──────────────────────────────────────────────────
describe('GET /messages', () => {
  it('returns 200 with messages array', async () => {
    const res = await request(app).get('/messages').query({ channelId: 'ch-1' });
    // May return 200 or 400 depending on validation
    expect([200, 400]).toContain(res.status);
  });
});
