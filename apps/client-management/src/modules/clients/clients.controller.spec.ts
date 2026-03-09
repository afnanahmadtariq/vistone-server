import {
  createClientHandler,
  getAllClientsHandler,
  getClientByIdHandler,
  updateClientHandler,
  deleteClientHandler,
} from './clients.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    client: {
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

const sampleClient = {
  id: 'client-1',
  name: 'GlobalCorp',
  email: 'contact@globalcorp.com',
  company: 'GlobalCorp Inc.',
  status: 'ACTIVE',
  portalAccess: false,
  createdAt: new Date(),
};

describe('Clients Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createClientHandler', () => {
    it('creates and returns a client', async () => {
      (prisma.client.create as jest.Mock).mockResolvedValue(sampleClient);
      const req: any = { body: { name: 'GlobalCorp', email: 'contact@globalcorp.com' } };
      const res = mockRes();

      await createClientHandler(req, res);

      expect(prisma.client.create).toHaveBeenCalledWith({ data: req.body });
      expect(res.json).toHaveBeenCalledWith(sampleClient);
    });

    it('returns 500 on error', async () => {
      (prisma.client.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createClientHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllClientsHandler', () => {
    it('returns all clients', async () => {
      (prisma.client.findMany as jest.Mock).mockResolvedValue([sampleClient]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllClientsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleClient]);
    });
  });

  describe('getClientByIdHandler', () => {
    it('returns client by id', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(sampleClient);
      const req: any = { params: { id: 'client-1' } };
      const res = mockRes();

      await getClientByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleClient);
    });

    it('returns 404 when not found', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getClientByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateClientHandler', () => {
    it('updates and returns client', async () => {
      const updated = { ...sampleClient, status: 'INACTIVE' };
      (prisma.client.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'client-1' }, body: { status: 'INACTIVE' } };
      const res = mockRes();

      await updateClientHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteClientHandler', () => {
    it('deletes client and returns success', async () => {
      (prisma.client.delete as jest.Mock).mockResolvedValue(sampleClient);
      const req: any = { params: { id: 'client-1' } };
      const res = mockRes();

      await deleteClientHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
