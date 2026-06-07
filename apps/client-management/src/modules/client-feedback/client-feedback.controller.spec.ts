import {
  createClientFeedbackHandler,
  getAllClientFeedbacksHandler,
  getClientFeedbackByIdHandler,
  updateClientFeedbackHandler,
  deleteClientFeedbackHandler,
} from './client-feedback.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    clientFeedback: {
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
  id: 'fb-1',
  clientId: 'client-1',
  projectId: 'proj-1',
  rating: 5,
  comment: 'Excellent work!',
  createdAt: new Date(),
};

describe('ClientFeedback Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createClientFeedbackHandler', () => {
    it('creates and returns feedback', async () => {
      (prisma.clientFeedback.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { clientId: 'client-1', rating: 5 } };
      const res = mockRes();
      await createClientFeedbackHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
  });

  describe('getAllClientFeedbacksHandler', () => {
    it('returns all feedbacks', async () => {
      (prisma.clientFeedback.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllClientFeedbacksHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getClientFeedbackByIdHandler', () => {
    it('returns feedback by id', async () => {
      (prisma.clientFeedback.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'fb-1' } };
      const res = mockRes();
      await getClientFeedbackByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.clientFeedback.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getClientFeedbackByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateClientFeedbackHandler', () => {
    it('updates and returns feedback', async () => {
      const updated = { ...sample, comment: 'Good job' };
      (prisma.clientFeedback.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'fb-1' }, body: { comment: 'Good job' } };
      const res = mockRes();
      await updateClientFeedbackHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteClientFeedbackHandler', () => {
    it('deletes feedback and returns success', async () => {
      (prisma.clientFeedback.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'fb-1' } };
      const res = mockRes();
      await deleteClientFeedbackHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
