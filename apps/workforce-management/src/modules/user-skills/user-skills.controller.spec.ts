import {
  createUserSkillHandler,
  getAllUserSkillsHandler,
  getUserSkillByIdHandler,
  updateUserSkillHandler,
  deleteUserSkillHandler,
} from './user-skills.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    userSkill: {
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

const sample = { id: 'sk-1', userId: 'user-1', skill: 'TypeScript', level: 'ADVANCED', createdAt: new Date() };

describe('UserSkills Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createUserSkillHandler', () => {
    it('creates and returns a user skill', async () => {
      (prisma.userSkill.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { userId: 'user-1', skill: 'TypeScript' } };
      const res = mockRes();

      await createUserSkillHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.userSkill.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createUserSkillHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllUserSkillsHandler', () => {
    it('returns all user skills', async () => {
      (prisma.userSkill.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllUserSkillsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getUserSkillByIdHandler', () => {
    it('returns skill by id', async () => {
      (prisma.userSkill.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'sk-1' } };
      const res = mockRes();

      await getUserSkillByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.userSkill.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getUserSkillByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUserSkillHandler', () => {
    it('updates and returns skill', async () => {
      const updated = { ...sample, level: 'EXPERT' };
      (prisma.userSkill.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'sk-1' }, body: { level: 'EXPERT' } };
      const res = mockRes();

      await updateUserSkillHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteUserSkillHandler', () => {
    it('deletes skill and returns success', async () => {
      (prisma.userSkill.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'sk-1' } };
      const res = mockRes();

      await deleteUserSkillHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
