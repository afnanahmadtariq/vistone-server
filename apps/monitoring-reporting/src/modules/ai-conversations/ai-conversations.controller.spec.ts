import {
  createAiConversationHandler,
  getAllAiConversationsHandler,
  getAiConversationByIdHandler,
  updateAiConversationHandler,
  deleteAiConversationHandler,
} from './ai-conversations.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    aiConversation: {
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

const sample = { id: 'ac-1', userId: 'u1', title: 'Chat about KPIs' };

describe('AiConversations Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createAiConversationHandler', () => {
    it('creates and returns conversation', async () => {
      (prisma.aiConversation.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { userId: 'u1', title: 'Chat about KPIs' } };
      const res = mockRes();
      await createAiConversationHandler(req, res);
      expect(prisma.aiConversation.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.aiConversation.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createAiConversationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create AI conversation' });
    });
  });

  describe('getAllAiConversationsHandler', () => {
    it('returns all conversations', async () => {
      (prisma.aiConversation.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = {};
      const res = mockRes();
      await getAllAiConversationsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 500 on error', async () => {
      (prisma.aiConversation.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {};
      const res = mockRes();
      await getAllAiConversationsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAiConversationByIdHandler', () => {
    it('returns conversation by id', async () => {
      (prisma.aiConversation.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'ac-1' } };
      const res = mockRes();
      await getAiConversationByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.aiConversation.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'nope' } };
      const res = mockRes();
      await getAiConversationByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.aiConversation.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'ac-1' } };
      const res = mockRes();
      await getAiConversationByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateAiConversationHandler', () => {
    it('updates and returns conversation', async () => {
      const updated = { ...sample, title: 'Updated' };
      (prisma.aiConversation.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'ac-1' }, body: { title: 'Updated' } };
      const res = mockRes();
      await updateAiConversationHandler(req, res);
      expect(prisma.aiConversation.update).toHaveBeenCalledWith({ where: { id: 'ac-1' }, data: req.body });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.aiConversation.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'ac-1' }, body: {} };
      const res = mockRes();
      await updateAiConversationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAiConversationHandler', () => {
    it('deletes and returns success', async () => {
      (prisma.aiConversation.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'ac-1' } };
      const res = mockRes();
      await deleteAiConversationHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'AI conversation deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.aiConversation.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'ac-1' } };
      const res = mockRes();
      await deleteAiConversationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
