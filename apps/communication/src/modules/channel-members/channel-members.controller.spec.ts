import {
  createChannelMemberHandler,
  getAllChannelMembersHandler,
  getChannelMemberByIdHandler,
  updateChannelMemberHandler,
  deleteChannelMemberHandler,
} from './channel-members.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    channelMember: {
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

const sample = { id: 'cm-1', channelId: 'ch-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() };

describe('ChannelMembers Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createChannelMemberHandler', () => {
    it('creates and returns a channel member', async () => {
      (prisma.channelMember.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { channelId: 'ch-1', userId: 'user-1' } };
      const res = mockRes();
      await createChannelMemberHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.channelMember.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createChannelMemberHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllChannelMembersHandler', () => {
    it('returns all channel members', async () => {
      (prisma.channelMember.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllChannelMembersHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getChannelMemberByIdHandler', () => {
    it('returns member by id', async () => {
      (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'cm-1' } };
      const res = mockRes();
      await getChannelMemberByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.channelMember.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getChannelMemberByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateChannelMemberHandler', () => {
    it('updates and returns member', async () => {
      const updated = { ...sample, role: 'ADMIN' };
      (prisma.channelMember.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'cm-1' }, body: { role: 'ADMIN' } };
      const res = mockRes();
      await updateChannelMemberHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteChannelMemberHandler', () => {
    it('deletes member and returns success', async () => {
      (prisma.channelMember.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'cm-1' } };
      const res = mockRes();
      await deleteChannelMemberHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
