import {
  createTaskHandler,
  getAllTasksHandler,
  getTaskByIdHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from './tasks.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    task: {
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

const sampleTask = {
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Fix Bug #123',
  status: 'TODO',
  priority: 'HIGH',
  assigneeId: null,
  dueDate: null,
  estimatedHours: null,
  actualHours: null,
  createdAt: new Date(),
};

describe('Tasks Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTaskHandler', () => {
    it('creates and returns a task', async () => {
      (prisma.task.create as jest.Mock).mockResolvedValue(sampleTask);
      const req: any = { body: { projectId: 'proj-1', title: 'Fix Bug #123', status: 'TODO' } };
      const res = mockRes();

      await createTaskHandler(req, res);

      expect(prisma.task.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sampleTask);
    });

    it('returns 500 on error', async () => {
      (prisma.task.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createTaskHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllTasksHandler', () => {
    it('returns all tasks', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([sampleTask]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllTasksHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleTask]);
    });

    it('filters by projectId when provided', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([sampleTask]);
      const req: any = { query: { projectId: 'proj-1' } };
      const res = mockRes();

      await getAllTasksHandler(req, res);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ projectId: 'proj-1' }) })
      );
    });
  });

  describe('getTaskByIdHandler', () => {
    it('returns task when found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(sampleTask);
      const req: any = { params: { id: 'task-1' } };
      const res = mockRes();

      await getTaskByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleTask);
    });

    it('returns 404 when not found', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getTaskByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTaskHandler', () => {
    it('updates and returns task', async () => {
      const updated = { ...sampleTask, status: 'IN_PROGRESS' };
      (prisma.task.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'task-1' }, body: { status: 'IN_PROGRESS' } };
      const res = mockRes();

      await updateTaskHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteTaskHandler', () => {
    it('deletes task and returns success', async () => {
      (prisma.task.delete as jest.Mock).mockResolvedValue(sampleTask);
      const req: any = { params: { id: 'task-1' } };
      const res = mockRes();

      await deleteTaskHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Task deleted' });
    });
  });
});
