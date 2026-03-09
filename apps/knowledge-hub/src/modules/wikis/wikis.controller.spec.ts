import {
  createWiki as createWikiHandler,
  getWikis as getAllWikisHandler,
  getWikiById as getWikiByIdHandler,
  updateWiki as updateWikiHandler,
  deleteWiki as deleteWikiHandler,
} from './wikis.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    wiki: {
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

const sample = { id: 'wiki-1', organizationId: 'org-1', name: 'Company Wiki', description: null, createdAt: new Date() };

describe('Wikis Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createWikiHandler', () => {
    it('creates and returns a wiki', async () => {
      (prisma.wiki.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { organizationId: 'org-1', name: 'Company Wiki' } };
      const res = mockRes();
      await createWikiHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.wiki.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createWikiHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllWikisHandler', () => {
    it('returns all wikis', async () => {
      (prisma.wiki.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: { organizationId: 'org-1' } };
      const res = mockRes();
      await getAllWikisHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getWikiByIdHandler', () => {
    it('returns wiki by id', async () => {
      (prisma.wiki.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'wiki-1' } };
      const res = mockRes();
      await getWikiByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.wiki.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getWikiByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateWikiHandler', () => {
    it('updates and returns wiki', async () => {
      const updated = { ...sample, name: 'Updated Wiki' };
      (prisma.wiki.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'wiki-1' }, body: { name: 'Updated Wiki' } };
      const res = mockRes();
      await updateWikiHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteWikiHandler', () => {
    it('deletes wiki and returns success', async () => {
      (prisma.wiki.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'wiki-1' } };
      const res = mockRes();
      await deleteWikiHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
