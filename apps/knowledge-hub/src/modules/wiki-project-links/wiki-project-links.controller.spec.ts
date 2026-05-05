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
      findUnique: jest.fn(),
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
      (prisma.wikiProjectLink.findUnique as jest.Mock).mockResolvedValue(null);
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
      (prisma.wikiProjectLink.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.wikiProjectLink.create as jest.Mock).mockRejectedValue(err);
      const req: any = { body: { wikiId: 'wiki-1', projectId: 'proj-1' } };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(prisma.wikiProjectLink.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.wikiProjectLink.create).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      // Matches catch block in controller (distinct from the longer duplicate-wiki guard message)
      expect(res.json).toHaveBeenCalledWith({
        error: 'This wiki is already linked to a project',
      });
    });

    it('returns 400 when wiki is already linked (pre-check)', async () => {
      (prisma.wikiProjectLink.findUnique as jest.Mock).mockResolvedValueOnce(sampleLink);
      const req: any = { body: { wikiId: 'wiki-1', projectId: 'proj-2' } };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(prisma.wikiProjectLink.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This wiki is already linked to a project. Each wiki can only be linked to one project.',
      });
    });

    it('returns 400 when wikiId or projectId is missing', async () => {
      const req: any = { body: {} };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on generic error', async () => {
      (prisma.wikiProjectLink.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.wikiProjectLink.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { wikiId: 'wiki-1', projectId: 'proj-1' } };
      const res = mockRes();
      await createWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteWikiProjectLink', () => {
    it('deletes link and returns success', async () => {
      (prisma.wikiProjectLink.findUnique as jest.Mock).mockResolvedValue(sampleLink);
      (prisma.wikiProjectLink.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'link-1' } };
      const res = mockRes();
      await deleteWikiProjectLink(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Link deleted successfully' });
    });

    it('returns 500 on error', async () => {
      (prisma.wikiProjectLink.findUnique as jest.Mock).mockResolvedValue(sampleLink);
      (prisma.wikiProjectLink.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'link-1' } };
      const res = mockRes();
      await deleteWikiProjectLink(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getWikiProjectLinks', () => {
    it('returns 400 when neither wikiId nor projectId is provided', async () => {
      const req: any = { query: {} };
      const res = mockRes();
      await getWikiProjectLinks(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.wikiProjectLink.findMany).not.toHaveBeenCalled();
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
      const req: any = { query: { wikiId: 'wiki-1' } };
      const res = mockRes();
      await getWikiProjectLinks(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
