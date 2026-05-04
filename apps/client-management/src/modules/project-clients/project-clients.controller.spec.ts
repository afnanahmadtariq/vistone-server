import {
  createProjectClientHandler,
  getAllProjectClientsHandler,
  getProjectClientByIdHandler,
  updateProjectClientHandler,
  deleteProjectClientHandler,
} from './project-clients.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    projectClient: {
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

const sample = { id: 'pc-1', projectId: 'proj-1', clientId: 'client-1', role: 'STAKEHOLDER', createdAt: new Date() };

describe('ProjectClients Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createProjectClientHandler', () => {
    it('creates and returns a project-client link', async () => {
      (prisma.projectClient.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { projectId: 'proj-1', clientId: 'client-1' } };
      const res = mockRes();
      await createProjectClientHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.projectClient.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createProjectClientHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllProjectClientsHandler', () => {
    it('returns all project clients', async () => {
      (prisma.projectClient.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllProjectClientsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getProjectClientByIdHandler', () => {
    it('returns project-client by id', async () => {
      (prisma.projectClient.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'pc-1' } };
      const res = mockRes();
      await getProjectClientByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.projectClient.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getProjectClientByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateProjectClientHandler', () => {
    it('updates and returns project-client', async () => {
      const updated = { ...sample, role: 'OWNER' };
      (prisma.projectClient.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'pc-1' }, body: { role: 'OWNER' } };
      const res = mockRes();
      await updateProjectClientHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteProjectClientHandler', () => {
    it('deletes and returns success', async () => {
      (prisma.projectClient.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'pc-1' } };
      const res = mockRes();
      await deleteProjectClientHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
