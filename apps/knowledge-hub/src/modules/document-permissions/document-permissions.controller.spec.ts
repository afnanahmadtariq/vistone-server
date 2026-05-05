import {
  createDocumentPermissionHandler,
  getAllDocumentPermissionsHandler,
  getDocumentPermissionByIdHandler,
  updateDocumentPermissionHandler,
  deleteDocumentPermissionHandler,
} from './document-permissions.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      findUnique: jest.fn(),
    },
    documentPermission: {
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

const sample = { id: 'dp-1', documentId: 'doc-1', userId: 'user-1', permission: 'read' };
const docRow = { id: 'doc-1', wikiId: 'wiki-1' };

describe('DocumentPermissions Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDocumentPermissionHandler', () => {
    it('creates and returns permission', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { documentId: 'doc-1', userId: 'user-1', permission: 'read' } };
      const res = mockRes();
      await createDocumentPermissionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 400 when documentId is missing', async () => {
      const req: any = { body: { permission: 'read' } };
      const res = mockRes();
      await createDocumentPermissionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on error', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { documentId: 'doc-1', permission: 'read' } };
      const res = mockRes();
      await createDocumentPermissionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllDocumentPermissionsHandler', () => {
    it('returns permissions for documentId', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: { documentId: 'doc-1' } };
      const res = mockRes();
      await getAllDocumentPermissionsHandler(req, res);
      expect(prisma.documentPermission.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc-1' },
      });
      expect(res.json).toHaveBeenCalledWith([sample]);
    });

    it('returns 400 when documentId query is missing', async () => {
      const req: any = { query: {} };
      const res = mockRes();
      await getAllDocumentPermissionsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on error', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { query: { documentId: 'doc-1' } };
      const res = mockRes();
      await getAllDocumentPermissionsHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getDocumentPermissionByIdHandler', () => {
    it('returns permission by id', async () => {
      (prisma.documentPermission.findUnique as jest.Mock).mockResolvedValue(sample);
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      const req: any = { params: { id: 'dp-1' } };
      const res = mockRes();
      await getDocumentPermissionByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.documentPermission.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getDocumentPermissionByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      (prisma.documentPermission.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'dp-1' } };
      const res = mockRes();
      await getDocumentPermissionByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateDocumentPermissionHandler', () => {
    it('updates and returns permission', async () => {
      const updated = { ...sample, permission: 'write' };
      (prisma.documentPermission.findUnique as jest.Mock).mockResolvedValue(sample);
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'dp-1' }, body: { permission: 'write' } };
      const res = mockRes();
      await updateDocumentPermissionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.documentPermission.findUnique as jest.Mock).mockResolvedValue(sample);
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'dp-1' }, body: {} };
      const res = mockRes();
      await updateDocumentPermissionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteDocumentPermissionHandler', () => {
    it('deletes and returns success', async () => {
      (prisma.documentPermission.findUnique as jest.Mock).mockResolvedValue(sample);
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.delete as jest.Mock).mockResolvedValue({});
      const req: any = { params: { id: 'dp-1' } };
      const res = mockRes();
      await deleteDocumentPermissionHandler(req, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Document permission deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.documentPermission.findUnique as jest.Mock).mockResolvedValue(sample);
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(docRow);
      (prisma.documentPermission.delete as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'dp-1' } };
      const res = mockRes();
      await deleteDocumentPermissionHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
