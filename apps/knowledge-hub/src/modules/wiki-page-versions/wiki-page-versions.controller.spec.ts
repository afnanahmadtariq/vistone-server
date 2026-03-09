import {
  createWikiPageVersionHandler,
  getAllWikiPageVersionsHandler,
  getWikiPageVersionByIdHandler,
} from './wiki-page-versions.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    wikiPageVersion: {
      create: jest.fn(),
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

const sample = { id: 'wv-1', wikiPageId: 'wp-1', content: 'Version 1 content', version: 1, authorId: 'user-1', createdAt: new Date() };

describe('WikiPageVersions Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createWikiPageVersionHandler', () => {
    it('creates and returns a wiki page version', async () => {
      (prisma.wikiPageVersion.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { wikiPageId: 'wp-1', content: 'Version 1 content' } };
      const res = mockRes();
      await createWikiPageVersionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.wikiPageVersion.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createWikiPageVersionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllWikiPageVersionsHandler', () => {
    it('returns all versions', async () => {
      (prisma.wikiPageVersion.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllWikiPageVersionsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getWikiPageVersionByIdHandler', () => {
    it('returns version by id', async () => {
      (prisma.wikiPageVersion.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'wv-1' } };
      const res = mockRes();
      await getWikiPageVersionByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.wikiPageVersion.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getWikiPageVersionByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
