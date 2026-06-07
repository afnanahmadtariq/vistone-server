import {
  createTaskChecklistHandler,
  getAllTaskChecklistsHandler,
  getTaskChecklistByIdHandler,
  updateTaskChecklistHandler,
  deleteTaskChecklistHandler,
} from './task-checklists.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    taskChecklist: {
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
  id: 'cl-1',
  taskId: 'task-1',
  item: 'Write unit tests',
  completed: false,
  createdAt: new Date(),
};

describe('TaskChecklists Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTaskChecklistHandler', () => {
    it('creates and returns a checklist item', async () => {
      (prisma.taskChecklist.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { taskId: 'task-1', item: 'Write unit tests' } };
      const res = mockRes();

      await createTaskChecklistHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.taskChecklist.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createTaskChecklistHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllTaskChecklistsHandler', () => {
    it('returns all checklists', async () => {
      (prisma.taskChecklist.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllTaskChecklistsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getTaskChecklistByIdHandler', () => {
    it('returns checklist by id', async () => {
      (prisma.taskChecklist.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'cl-1' } };
      const res = mockRes();

      await getTaskChecklistByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.taskChecklist.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getTaskChecklistByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTaskChecklistHandler', () => {
    it('updates and returns checklist item', async () => {
      const updated = { ...sample, completed: true };
      (prisma.taskChecklist.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'cl-1' }, body: { completed: true } };
      const res = mockRes();

      await updateTaskChecklistHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteTaskChecklistHandler', () => {
    it('deletes checklist item and returns success', async () => {
      (prisma.taskChecklist.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'cl-1' } };
      const res = mockRes();

      await deleteTaskChecklistHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
