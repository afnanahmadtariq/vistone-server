import {
  createDocumentHandler,
  getAllDocumentsHandler,
  getDocumentByIdHandler,
  updateDocumentHandler,
  deleteDocumentHandler,
} from './documents.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
    },
    documentPermission: {
      deleteMany: jest.fn(),
    },
    documentLink: {
      deleteMany: jest.fn(),
    },
    wiki: {
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

const sample = {
  id: 'doc-1',
  wikiId: 'wiki-1',
  folderId: 'folder-1',
  name: 'Architecture Overview',
  url: 'https://example.com/doc.pdf',
  uploadedById: 'uploader-1',
  metadata: null as unknown,
  content: 'This doc describes...',
  mimeType: 'text/markdown',
  createdAt: new Date(),
};

describe('Documents Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDocumentHandler', () => {
    it('creates and returns a document', async () => {
      (prisma.wiki.findUnique as jest.Mock).mockResolvedValue({ organizationId: 'org-1' });
      (prisma.document.create as jest.Mock).mockResolvedValue(sample);
      const req: any = {
        body: {
          organizationId: 'org-1',
          wikiId: 'wiki-1',
          folderId: 'folder-1',
          name: 'Architecture Overview',
          url: 'https://example.com/doc.pdf',
        },
        internalUser: { id: 'uploader-1', organizationId: 'org-1' },
      };
      const res = mockRes();
      await createDocumentHandler(req, res);
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ uploadedById: 'uploader-1' }),
        }),
      );
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 400 when wikiId is missing', async () => {
      const req: any = { body: { folderId: 'folder-1', name: 'Architecture Overview' } };
      const res = mockRes();
      await createDocumentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
    it('returns 500 on error', async () => {
      (prisma.wiki.findUnique as jest.Mock).mockResolvedValue({ organizationId: 'org-1' });
      (prisma.document.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = {
        body: {
          organizationId: 'org-1',
          wikiId: 'wiki-1',
          folderId: 'folder-1',
          name: 'Architecture Overview',
          url: 'https://example.com/doc.pdf',
        },
        internalUser: { id: 'uploader-1', organizationId: 'org-1' },
      };
      const res = mockRes();
      await createDocumentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllDocumentsHandler', () => {
    it('returns all documents', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllDocumentsHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('defaults to root documents when wikiId is provided', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: { wikiId: 'wiki-1' } };
      const res = mockRes();
      await getAllDocumentsHandler(req, res);
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { wikiId: 'wiki-1', folderId: null },
        })
      );
    });

    it('allows includeAll to return all documents for a wiki', async () => {
      (prisma.document.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: { wikiId: 'wiki-1', includeAll: 'true' } };
      const res = mockRes();
      await getAllDocumentsHandler(req, res);
      const call = (prisma.document.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ wikiId: 'wiki-1' });
    });
  });

  describe('getDocumentByIdHandler', () => {
    it('returns document by id', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'doc-1' } };
      const res = mockRes();
      await getDocumentByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getDocumentByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateDocumentHandler', () => {
    it('updates and returns document when caller is the uploader', async () => {
      const updated = { ...sample, name: 'Updated Doc' };
      (prisma.wiki.findUnique as jest.Mock).mockResolvedValue({ organizationId: 'org-1' });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(sample);
      (prisma.documentVersion.create as jest.Mock).mockResolvedValue({});
      (prisma.document.update as jest.Mock).mockResolvedValue(updated);
      const req: any = {
        params: { id: 'doc-1' },
        body: { name: 'Updated Doc' },
        internalUser: { id: 'uploader-1', organizationId: 'org-1' },
      };
      const res = mockRes();
      await updateDocumentHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 403 when caller is not the uploader', async () => {
      (prisma.wiki.findUnique as jest.Mock).mockResolvedValue({ organizationId: 'org-1' });
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = {
        params: { id: 'doc-1' },
        body: { name: 'Updated Doc' },
        internalUser: { id: 'someone-else', organizationId: 'org-1' },
      };
      const res = mockRes();
      await updateDocumentHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteDocumentHandler', () => {
    it('deletes document and returns success', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue({ ...sample, wiki: { metadata: {} } });
      (prisma.documentPermission.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.document.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'doc-1' } };
      const res = mockRes();
      await deleteDocumentHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
