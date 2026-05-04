import {
  createWikiProjectLink,
  deleteWikiProjectLink,
  getWikiProjectLinks,
} from './wiki-project-links.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    wikiProjectLink: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
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

const sampleLink = { id: 'link-1', wikiId: 'wiki-1', projectId: 'proj-1' };

describe('WikiProjectLinks Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createWikiProjectLink', () => {
    it('creates link and returns 201', async () => {
      (prisma.wikiProjectLink.create as jest.Mock).mockResolvedValue(sampleLink);
      const req: any = { body: { wikiId: 'wiki-1', projectId: 'proj-1' } };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(sampleLink);
    });

    it('returns 400 on unique constraint violation (P2002)', async () => {
      const err: any = new Error('Unique');
      err.code = 'P2002';
      (prisma.wikiProjectLink.create as jest.Mock).mockRejectedValue(err);
      const req: any = { body: { wikiId: 'wiki-1', projectId: 'proj-1' } };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'This wiki is already linked to this project' });
    });

    it('returns 500 on generic error', async () => {
      (prisma.wikiProjectLink.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteWikiProjectLink', () => {
    it('deletes link and returns success', async () => {
      (prisma.wikiProjectLink.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'link-1' } };
      const res = mockRes();
      await deleteWikiProjectLink(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Link deleted successfully' });
    });

    it('returns 500 on error', async () => {
      (prisma.wikiProjectLink.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'link-1' } };
      const res = mockRes();
      await deleteWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getWikiProjectLinks', () => {
    it('returns all links without filter', async () => {
      (prisma.wikiProjectLink.findMany as jest.Mock).mockResolvedValue([sampleLink]);
      const req: any = { query: {} };
      const res = mockRes();
      await getWikiProjectLinks(req, res);
      expect(prisma.wikiProjectLink.findMany).toHaveBeenCalledWith({ where: {}, include: { wiki: true } });
      expect(res.json).toHaveBeenCalledWith([sampleLink]);
    });

    it('filters by projectId', async () => {
      (prisma.wikiProjectLink.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { projectId: 'proj-1' } };
      const res = mockRes();
      await getWikiProjectLinks(req, res);
      expect(prisma.wikiProjectLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: 'proj-1' } }),
      );
    });

    it('filters by wikiId', async () => {
      (prisma.wikiProjectLink.findMany as jest.Mock).mockResolvedValue([]);
      const req: any = { query: { wikiId: 'wiki-1' } };
      const res = mockRes();
      await getWikiProjectLinks(req, res);
      expect(prisma.wikiProjectLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { wikiId: 'wiki-1' } }),
      );
    });

    it('returns 500 on error', async () => {
      (prisma.wikiProjectLink.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { query: {} };
      const res = mockRes();
      await getWikiProjectLinks(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
