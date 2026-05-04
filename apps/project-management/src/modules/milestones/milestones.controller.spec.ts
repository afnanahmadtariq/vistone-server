import {
  createMilestoneHandler,
  getAllMilestonesHandler,
  getMilestoneByIdHandler,
  updateMilestoneHandler,
  deleteMilestoneHandler,
} from './milestones.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    milestone: {
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

const sampleMilestone = {
  id: 'ms-1',
  projectId: 'proj-1',
  title: 'MVP Launch',
  dueDate: new Date('2025-12-01'),
  status: 'PENDING',
  createdAt: new Date(),
};

describe('Milestones Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createMilestoneHandler', () => {
    it('creates and returns a milestone', async () => {
      (prisma.milestone.create as jest.Mock).mockResolvedValue(sampleMilestone);
      const req: any = { body: { projectId: 'proj-1', title: 'MVP Launch' } };
      const res = mockRes();

      await createMilestoneHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleMilestone);
    });

    it('returns 500 on error', async () => {
      (prisma.milestone.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { projectId: 'proj-1', title: 'Fail' } };
      const res = mockRes();

      await createMilestoneHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllMilestonesHandler', () => {
    it('returns all milestones', async () => {
      (prisma.milestone.findMany as jest.Mock).mockResolvedValue([sampleMilestone]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllMilestonesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleMilestone]);
    });
  });

  describe('getMilestoneByIdHandler', () => {
    it('returns milestone when found', async () => {
      (prisma.milestone.findUnique as jest.Mock).mockResolvedValue(sampleMilestone);
      const req: any = { params: { id: 'ms-1' } };
      const res = mockRes();

      await getMilestoneByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleMilestone);
    });

    it('returns 404 when not found', async () => {
      (prisma.milestone.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getMilestoneByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMilestoneHandler', () => {
    it('updates and returns milestone', async () => {
      const updated = { ...sampleMilestone, status: 'COMPLETED' };
      (prisma.milestone.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'ms-1' }, body: { status: 'COMPLETED' } };
      const res = mockRes();

      await updateMilestoneHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteMilestoneHandler', () => {
    it('deletes milestone and returns success', async () => {
      (prisma.milestone.delete as jest.Mock).mockResolvedValue(sampleMilestone);
      const req: any = { params: { id: 'ms-1' } };
      const res = mockRes();

      await deleteMilestoneHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
