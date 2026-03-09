import {
  getChannelMediaHandler,
  getMessagesHandler,
  getMessageByIdHandler,
  createMessageHandler,
} from './messages.controller';

// Mock Mongoose Message model
jest.mock('../../models/message.model', () => {
  const chainable = () => {
    const chain: any = {};
    chain.sort = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.lean = jest.fn().mockResolvedValue([]);
    chain._leanResult = (val: any) => { chain.lean = jest.fn().mockResolvedValue(val); return chain; };
    return chain;
  };

  return {
    Message: {
      find: jest.fn().mockReturnValue(chainable()),
      findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      create: jest.fn(),
    },
  };
});

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    channelMember: { findUnique: jest.fn() },
    chatChannel: { update: jest.fn() },
  },
}));

jest.mock('../../lib/socket', () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  }),
}));

import { Message } from '../../models/message.model';
import prisma from '../../lib/prisma';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

// Helper to make Message.find return chainable with specified result
function mockFind(result: any[]) {
  const chain: any = {};
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockResolvedValue(result);
  (Message.find as jest.Mock).mockReturnValue(chain);
  return chain;
}

function mockFindById(result: any) {
  const chain: any = { lean: jest.fn().mockResolvedValue(result) };
  (Message.findById as jest.Mock).mockReturnValue(chain);
}

describe('Messages Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- getChannelMediaHandler ---
  describe('getChannelMediaHandler', () => {
    it('returns 400 if channelId missing', async () => {
      const req: any = { query: {} };
      const res = mockRes();
      await getChannelMediaHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'channelId is required' });
    });

    it('returns flattened media from messages with attachments', async () => {
      const msgs = [
        {
          _id: 'm1',
          senderId: 'u1',
          channelId: 'ch1',
          createdAt: new Date('2024-01-01'),
          attachments: [{ url: 'http://a.png', fileType: 'image' }],
        },
      ];
      mockFind(msgs);

      const req: any = { query: { channelId: 'ch1' } };
      const res = mockRes();
      await getChannelMediaHandler(req, res);

      expect(res.json).toHaveBeenCalled();
      const data = (res.json as jest.Mock).mock.calls[0][0];
      expect(data.media).toHaveLength(1);
      expect(data.media[0].url).toBe('http://a.png');
      expect(data.media[0].messageId).toBe('m1');
    });

    it('supports cursor-based pagination', async () => {
      mockFind([]);
      const req: any = { query: { channelId: 'ch1', cursor: '2024-06-01T00:00:00.000Z' } };
      const res = mockRes();
      await getChannelMediaHandler(req, res);

      const findCall = (Message.find as jest.Mock).mock.calls[0][0];
      expect(findCall.createdAt).toEqual({ $lt: expect.any(Date) });
    });

    it('supports fileType filter', async () => {
      mockFind([]);
      const req: any = { query: { channelId: 'ch1', fileType: 'image' } };
      const res = mockRes();
      await getChannelMediaHandler(req, res);

      const findCall = (Message.find as jest.Mock).mock.calls[0][0];
      expect(findCall['attachments.fileType']).toBe('image');
    });

    it('returns 500 on error', async () => {
      (Message.find as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
      const req: any = { query: { channelId: 'ch1' } };
      const res = mockRes();
      await getChannelMediaHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- getMessagesHandler ---
  describe('getMessagesHandler', () => {
    it('returns 400 if channelId missing', async () => {
      const req: any = { query: {} };
      const res = mockRes();
      await getMessagesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns messages in chronological order', async () => {
      const msgs = [
        { _id: 'm2', createdAt: new Date('2024-01-02') },
        { _id: 'm1', createdAt: new Date('2024-01-01') },
      ];
      mockFind(msgs);

      const req: any = { query: { channelId: 'ch1' } };
      const res = mockRes();
      await getMessagesHandler(req, res);

      const data = (res.json as jest.Mock).mock.calls[0][0];
      expect(data.messages).toHaveLength(2);
      // reversed for chronological order
      expect(data.messages[0]._id).toBe('m1');
    });

    it('returns hasMore=false when fewer than limit', async () => {
      mockFind([{ _id: 'm1', createdAt: new Date() }]);
      const req: any = { query: { channelId: 'ch1', limit: '50' } };
      const res = mockRes();
      await getMessagesHandler(req, res);
      const data = (res.json as jest.Mock).mock.calls[0][0];
      expect(data.hasMore).toBe(false);
      expect(data.nextCursor).toBeNull();
    });

    it('returns 500 on error', async () => {
      (Message.find as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
      const req: any = { query: { channelId: 'ch1' } };
      const res = mockRes();
      await getMessagesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- getMessageByIdHandler ---
  describe('getMessageByIdHandler', () => {
    it('returns message when found', async () => {
      const msg = { _id: 'm1', content: 'hello' };
      mockFindById(msg);
      const req: any = { params: { id: 'm1' } };
      const res = mockRes();
      await getMessageByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(msg);
    });

    it('returns 404 when not found', async () => {
      mockFindById(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getMessageByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (Message.findById as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
      const req: any = { params: { id: 'm1' } };
      const res = mockRes();
      await getMessageByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- createMessageHandler ---
  describe('createMessageHandler', () => {
    it('returns 400 if channelId or senderId missing', async () => {
      const req: any = { body: { content: 'hi' } };
      const res = mockRes();
      await createMessageHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'channelId and senderId are required' });
    });

    it('returns 403 if sender not a member', async () => {
      (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { body: { channelId: 'ch1', senderId: 'u1', content: 'hi' } };
      const res = mockRes();
      await createMessageHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 if no content and no attachments', async () => {
      (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue({ id: 'mem1' });
      const req: any = { body: { channelId: 'ch1', senderId: 'u1' } };
      const res = mockRes();
      await createMessageHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Message must have content or attachments' });
    });

    it('creates message, broadcasts via socket, touches channel', async () => {
      (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue({ id: 'mem1' });
      const created = { channelId: 'ch1', senderId: 'u1', content: 'hi', toJSON: () => ({ channelId: 'ch1', content: 'hi' }) };
      (Message.create as jest.Mock).mockResolvedValue(created);
      (prisma.chatChannel.update as jest.Mock).mockResolvedValue({});

      const req: any = { body: { channelId: 'ch1', senderId: 'u1', content: 'hi' } };
      const res = mockRes();
      await createMessageHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
      expect(prisma.chatChannel.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ch1' } }));
    });

    it('returns 500 on error', async () => {
      (prisma.channelMember.findUnique as jest.Mock).mockRejectedValue(new Error('fail'));
      const req: any = { body: { channelId: 'ch1', senderId: 'u1', content: 'hi' } };
      const res = mockRes();
      await createMessageHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
