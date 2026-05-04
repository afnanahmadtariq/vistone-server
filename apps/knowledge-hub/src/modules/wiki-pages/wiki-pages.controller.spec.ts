import {
  createWikiPageHandler,
  getAllWikiPagesHandler,
  getWikiPageByIdHandler,
  updateWikiPageHandler,
  deleteWikiPageHandler,
} from './wiki-pages.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    wikiPage: {
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

const sample = { id: 'wp-1', wikiId: 'wiki-1', title: 'Getting Started', content: '...', authorId: 'user-1', createdAt: new Date() };

describe('WikiPages Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createWikiPageHandler', () => {
    it('creates and returns a wiki page', async () => {
      (prisma.wikiPage.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { wikiId: 'wiki-1', title: 'Getting Started' } };
      const res = mockRes();
      await createWikiPageHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.wikiPage.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createWikiPageHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllWikiPagesHandler', () => {
    it('returns all wiki pages', async () => {
      (prisma.wikiPage.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllWikiPagesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getWikiPageByIdHandler', () => {
    it('returns page by id', async () => {
      (prisma.wikiPage.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'wp-1' } };
      const res = mockRes();
      await getWikiPageByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.wikiPage.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getWikiPageByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateWikiPageHandler', () => {
    it('updates and returns page', async () => {
      const updated = { ...sample, title: 'Updated' };
      (prisma.wikiPage.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'wp-1' }, body: { title: 'Updated' } };
      const res = mockRes();
      await updateWikiPageHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteWikiPageHandler', () => {
    it('deletes page and returns success', async () => {
      (prisma.wikiPage.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'wp-1' } };
      const res = mockRes();
      await deleteWikiPageHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
