import {
  createChatChannelHandler,
  getAllChatChannelsHandler,
  getChatChannelByIdHandler,
  updateChatChannelHandler,
  deleteChatChannelHandler,
} from './chat-channels.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    chatChannel: {
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

const sampleChannel = {
  id: 'ch-1',
  organizationId: 'org-1',
  name: 'general',
  type: 'PUBLIC',
  createdBy: 'user-1',
  projectId: null,
  createdAt: new Date(),
};

describe('ChatChannels Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createChatChannelHandler', () => {
    it('creates and returns a chat channel', async () => {
      (prisma.chatChannel.create as jest.Mock).mockResolvedValue(sampleChannel);
      const req: any = { body: { organizationId: 'org-1', type: 'PUBLIC', createdBy: 'user-1', name: 'general' } };
      const res = mockRes();

      await createChatChannelHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleChannel);
    });

    it('returns 400 when required fields missing', async () => {
      const req: any = { body: {} };
      const res = mockRes();

      await createChatChannelHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'organizationId, type, and createdBy are required' });
    });

    it('returns 500 on database error', async () => {
      (prisma.chatChannel.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { organizationId: 'org-1', type: 'PUBLIC', createdBy: 'user-1', name: 'general' } };
      const res = mockRes();

      await createChatChannelHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllChatChannelsHandler', () => {
    it('returns all chat channels', async () => {
      (prisma.chatChannel.findMany as jest.Mock).mockResolvedValue([sampleChannel]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllChatChannelsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleChannel]);
    });
  });

  describe('getChatChannelByIdHandler', () => {
    it('returns channel by id', async () => {
      (prisma.chatChannel.findUnique as jest.Mock).mockResolvedValue(sampleChannel);
      const req: any = { params: { id: 'ch-1' } };
      const res = mockRes();

      await getChatChannelByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleChannel);
    });

    it('returns 404 when not found', async () => {
      (prisma.chatChannel.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getChatChannelByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateChatChannelHandler', () => {
    it('updates and returns channel', async () => {
      const updated = { ...sampleChannel, name: 'engineering' };
      (prisma.chatChannel.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'ch-1' }, body: { name: 'engineering' } };
      const res = mockRes();

      await updateChatChannelHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteChatChannelHandler', () => {
    it('deletes channel and returns success', async () => {
      (prisma.chatChannel.delete as jest.Mock).mockResolvedValue(sampleChannel);
      const req: any = { params: { id: 'ch-1' } };
      const res = mockRes();

      await deleteChatChannelHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
