import {
  createDocumentFolderHandler,
  getAllDocumentFoldersHandler,
  getDocumentFolderByIdHandler,
  updateDocumentFolderHandler,
  deleteDocumentFolderHandler,
} from './document-folders.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    documentFolder: {
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

const sample = { id: 'df-1', name: 'Design Assets', organizationId: 'org-1', parentId: null, createdAt: new Date() };

describe('DocumentFolders Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDocumentFolderHandler', () => {
    it('creates and returns a folder', async () => {
      (prisma.documentFolder.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { name: 'Design Assets', organizationId: 'org-1' } };
      const res = mockRes();
      await createDocumentFolderHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
  });

  describe('getAllDocumentFoldersHandler', () => {
    it('returns all folders', async () => {
      (prisma.documentFolder.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllDocumentFoldersHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getDocumentFolderByIdHandler', () => {
    it('returns folder by id', async () => {
      (prisma.documentFolder.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'df-1' } };
      const res = mockRes();
      await getDocumentFolderByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.documentFolder.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getDocumentFolderByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateDocumentFolderHandler', () => {
    it('updates and returns folder', async () => {
      const updated = { ...sample, name: 'Updated Folder' };
      (prisma.documentFolder.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'df-1' }, body: { name: 'Updated Folder' } };
      const res = mockRes();
      await updateDocumentFolderHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteDocumentFolderHandler', () => {
    it('deletes folder and returns success', async () => {
      (prisma.documentFolder.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'df-1' } };
      const res = mockRes();
      await deleteDocumentFolderHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
