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
    documentPermission: {
      deleteMany: jest.fn(),
    },
    documentLink: {
      deleteMany: jest.fn(),
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
  folderId: 'folder-1',
  name: 'Architecture Overview',
  content: 'This doc describes...',
  mimeType: 'text/markdown',
  createdAt: new Date(),
};

describe('Documents Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDocumentHandler', () => {
    it('creates and returns a document', async () => {
      (prisma.document.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { folderId: 'folder-1', name: 'Architecture Overview' } };
      const res = mockRes();
      await createDocumentHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.document.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
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
    it('updates and returns document', async () => {
      const updated = { ...sample, name: 'Updated Doc' };
      (prisma.document.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'doc-1' }, body: { name: 'Updated Doc' } };
      const res = mockRes();
      await updateDocumentHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteDocumentHandler', () => {
    it('deletes document and returns success', async () => {
      (prisma.document.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'doc-1' } };
      const res = mockRes();
      await deleteDocumentHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
