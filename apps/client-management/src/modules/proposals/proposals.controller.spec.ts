import {
  createProposalHandler,
  getAllProposalsHandler,
  getProposalByIdHandler,
  updateProposalHandler,
  deleteProposalHandler,
} from './proposals.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    proposal: {
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
  id: 'prop-1',
  clientId: 'client-1',
  title: 'Website Redesign Proposal',
  status: 'DRAFT',
  budget: 50000,
  createdAt: new Date(),
};

describe('Proposals Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createProposalHandler', () => {
    it('creates and returns a proposal', async () => {
      (prisma.proposal.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { clientId: 'client-1', title: 'Website Redesign Proposal' } };
      const res = mockRes();

      await createProposalHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.proposal.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createProposalHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllProposalsHandler', () => {
    it('returns all proposals', async () => {
      (prisma.proposal.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllProposalsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getProposalByIdHandler', () => {
    it('returns proposal by id', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'prop-1' } };
      const res = mockRes();

      await getProposalByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getProposalByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateProposalHandler', () => {
    it('updates and returns proposal', async () => {
      const updated = { ...sample, status: 'SENT' };
      (prisma.proposal.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'prop-1' }, body: { status: 'SENT' } };
      const res = mockRes();

      await updateProposalHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteProposalHandler', () => {
    it('deletes proposal and returns success', async () => {
      (prisma.proposal.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'prop-1' } };
      const res = mockRes();

      await deleteProposalHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
