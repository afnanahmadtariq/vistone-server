import {
  createTaskDependencyHandler,
  getAllTaskDependenciesHandler,
  getTaskDependencyByIdHandler,
  updateTaskDependencyHandler,
  deleteTaskDependencyHandler,
} from './task-dependencies.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    taskDependency: {
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
  id: 'dep-1',
  taskId: 'task-1',
  dependsOnId: 'task-2',
  type: 'FINISH_TO_START',
  createdAt: new Date(),
};

describe('TaskDependencies Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTaskDependencyHandler', () => {
    it('creates and returns a task dependency', async () => {
      (prisma.taskDependency.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { taskId: 'task-1', dependsOnId: 'task-2' } };
      const res = mockRes();

      await createTaskDependencyHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.taskDependency.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createTaskDependencyHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllTaskDependenciesHandler', () => {
    it('returns all dependencies', async () => {
      (prisma.taskDependency.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllTaskDependenciesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getTaskDependencyByIdHandler', () => {
    it('returns dependency by id', async () => {
      (prisma.taskDependency.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'dep-1' } };
      const res = mockRes();

      await getTaskDependencyByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.taskDependency.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getTaskDependencyByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTaskDependencyHandler', () => {
    it('updates and returns dependency', async () => {
      const updated = { ...sample, type: 'START_TO_START' };
      (prisma.taskDependency.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'dep-1' }, body: { type: 'START_TO_START' } };
      const res = mockRes();

      await updateTaskDependencyHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteTaskDependencyHandler', () => {
    it('deletes dependency and returns success', async () => {
      (prisma.taskDependency.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'dep-1' } };
      const res = mockRes();

      await deleteTaskDependencyHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
