import {
  createMilestoneHandler,
  getAllMilestonesHandler,
  getMilestoneByIdHandler,
  updateMilestoneHandler,
  deleteMilestoneHandler,
} from './milestones.controller';

type CtlMocks = {
  milestoneFindUnique: jest.Mock;
  milestoneUpdate: jest.Mock;
  milestoneDependencyFindMany: jest.Mock;
};

jest.mock('../../lib/prisma', () => {
  const milestoneFindUnique = jest.fn();
  const milestoneUpdate = jest.fn();
  const milestoneDependencyFindMany = jest.fn();
  const prismaMock = {
    milestone: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: milestoneFindUnique,
      update: milestoneUpdate,
      delete: jest.fn(),
    },
    milestoneDependency: {
      findMany: milestoneDependencyFindMany,
    },
    $transaction: jest.fn(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)),
  };
  (globalThis as unknown as { __pmMilestoneCtlMocks: CtlMocks }).__pmMilestoneCtlMocks = {
    milestoneFindUnique,
    milestoneUpdate,
    milestoneDependencyFindMany,
  };
  return { __esModule: true, default: prismaMock };
});

import prisma from '../../lib/prisma';

const ctlMocks = (): CtlMocks => (globalThis as unknown as { __pmMilestoneCtlMocks: CtlMocks }).__pmMilestoneCtlMocks;

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
  completed: false,
  completedAt: null as Date | null,
  createdAt: new Date(),
};

describe('Milestones Controller – Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const m = ctlMocks();
    m.milestoneFindUnique.mockReset();
    m.milestoneUpdate.mockReset();
    m.milestoneDependencyFindMany.mockReset();
    m.milestoneDependencyFindMany.mockResolvedValue([]);
  });

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
    it('returns 404 when milestone missing', async () => {
      ctlMocks().milestoneFindUnique.mockResolvedValueOnce(null);
      const req: any = { params: { id: 'missing' }, body: { status: 'COMPLETED' } };
      const res = mockRes();

      await updateMilestoneHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates and returns milestone', async () => {
      const prev = { ...sampleMilestone, completed: false, status: 'IN_PROGRESS' };
      const updated = { ...prev, status: 'COMPLETED', completed: true, completedAt: new Date('2025-12-01') };
      ctlMocks().milestoneFindUnique.mockResolvedValueOnce(prev);
      ctlMocks().milestoneUpdate.mockResolvedValueOnce(updated);

      const req: any = { params: { id: 'ms-1' }, body: { status: 'COMPLETED', completed: true } };
      const res = mockRes();

      await updateMilestoneHandler(req, res);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('shifts FS successor due dates when predecessor completes late', async () => {
      const m = ctlMocks();
      const predDue = new Date(2025, 4, 1);
      const completedAt = new Date(2025, 4, 8, 12, 0, 0);
      const prev = {
        ...sampleMilestone,
        id: 'pred',
        dueDate: predDue,
        completed: false,
        status: 'READY_FOR_APPROVAL',
      };
      const updatedPred = {
        ...prev,
        completed: true,
        status: 'COMPLETED',
        completedAt,
      };
      const succDue = new Date(2025, 4, 15);
      const succ = {
        id: 'succ',
        dueDate: succDue,
        completed: false,
        status: 'NOT_STARTED',
      };

      m.milestoneFindUnique.mockImplementation((args: { where: { id: string } }) => {
        if (args.where.id === 'pred') return Promise.resolve(prev);
        if (args.where.id === 'succ') return Promise.resolve(succ);
        return Promise.resolve(null);
      });

      m.milestoneDependencyFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ milestoneId: 'succ', type: 'FS' }]);

      m.milestoneUpdate.mockImplementation((args: { where: { id: string }; data: Record<string, unknown> }) => {
        if (args.where.id === 'pred') return Promise.resolve(updatedPred);
        if (args.where.id === 'succ') return Promise.resolve({ ...succ, ...args.data });
        return Promise.resolve({});
      });

      const req: any = {
        params: { id: 'pred' },
        body: { status: 'COMPLETED', completed: true, completedAt: completedAt.toISOString() },
      };
      const res = mockRes();

      await updateMilestoneHandler(req, res);

      expect(m.milestoneUpdate).toHaveBeenCalledTimes(2);
      const succUpdate = m.milestoneUpdate.mock.calls.find((c) => c[0].where?.id === 'succ');
      expect(succUpdate).toBeDefined();
      const newDue = succUpdate![0].data.dueDate as Date;
      expect(newDue.getFullYear()).toBe(2025);
      expect(newDue.getMonth()).toBe(4);
      expect(newDue.getDate()).toBe(22);
      expect(res.json).toHaveBeenCalled();
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
