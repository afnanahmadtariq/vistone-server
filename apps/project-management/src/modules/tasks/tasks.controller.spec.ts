jest.mock("../../lib/milestone-task-sync", () => ({
  syncMilestoneWorkflowForMilestoneId: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../lib/prisma", () => ({
  __esModule: true,
  default: {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    milestone: {
      findFirst: jest.fn(),
    },
  },
}));

import prisma from "../../lib/prisma";
import {
  createTaskHandler,
  getAllTasksHandler,
  getTaskByIdHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from "./tasks.controller";

const mockRes = () => {
  const res: Record<string, unknown> = {};
  (res as { json: jest.Mock }).json = jest.fn().mockReturnValue(res);
  (res as { status: jest.Mock }).status = jest.fn().mockReturnValue(res);
  return res as { json: jest.Mock; status: jest.Mock };
};

const sampleTask = {
  id: "task-1",
  projectId: "proj-1",
  title: "Fix Bug #123",
  status: "TODO",
  priority: "HIGH",
  assigneeId: null,
  milestoneId: null,
  dueDate: null,
  estimatedHours: null,
  actualHours: null,
  createdAt: new Date(),
};

describe("Tasks Controller – Unit Tests", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("createTaskHandler", () => {
    it("creates and returns a task", async () => {
      (prisma.task.create as jest.Mock).mockResolvedValue(sampleTask);
      const req = { body: { projectId: "proj-1", title: "Fix Bug #123", status: "TODO" } } as Parameters<
        typeof createTaskHandler
      >[0];
      const res = mockRes();

      await createTaskHandler(req, res);

      expect(prisma.task.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sampleTask);
    });

    it("returns 500 on error", async () => {
      (prisma.task.create as jest.Mock).mockRejectedValue(new Error("DB"));
      const req = { body: {} } as Parameters<typeof createTaskHandler>[0];
      const res = mockRes();

      await createTaskHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("getAllTasksHandler", () => {
    it("returns all tasks", async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([sampleTask]);
      const req = { query: {} } as Parameters<typeof getAllTasksHandler>[0];
      const res = mockRes();

      await getAllTasksHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleTask]);
    });

    it("filters by projectId when provided", async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([sampleTask]);
      const req = { query: { projectId: "proj-1" } } as Parameters<typeof getAllTasksHandler>[0];
      const res = mockRes();

      await getAllTasksHandler(req, res);

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: "proj-1" }),
        }),
      );
    });
  });

  describe("getTaskByIdHandler", () => {
    it("returns task when found", async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(sampleTask);
      const req = { params: { id: "task-1" } } as Parameters<typeof getTaskByIdHandler>[0];
      const res = mockRes();

      await getTaskByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleTask);
    });

    it("returns 404 when not found", async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      const req = { params: { id: "missing" } } as Parameters<typeof getTaskByIdHandler>[0];
      const res = mockRes();

      await getTaskByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateTaskHandler", () => {
    it("updates and returns task", async () => {
      const updated = { ...sampleTask, status: "IN_PROGRESS" };
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({
        milestoneId: null,
        projectId: "proj-1",
      });
      (prisma.task.update as jest.Mock).mockResolvedValue(updated);
      const req = {
        params: { id: "task-1" },
        body: { status: "IN_PROGRESS" },
      } as Parameters<typeof updateTaskHandler>[0];
      const res = mockRes();

      await updateTaskHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe("deleteTaskHandler", () => {
    it("deletes task and returns success", async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ milestoneId: null });
      (prisma.task.delete as jest.Mock).mockResolvedValue(sampleTask);
      const req = { params: { id: "task-1" } } as Parameters<typeof deleteTaskHandler>[0];
      const res = mockRes();

      await deleteTaskHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, message: "Task deleted" });
    });
  });
});
