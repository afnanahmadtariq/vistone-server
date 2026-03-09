import {
  createOrganizationHandler,
  getAllOrganizationsHandler,
  getOrganizationByIdHandler,
  updateOrganizationHandler,
  deleteOrganizationHandler,
} from './organizations.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    organization: {
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

const sampleOrg = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  settings: null,
  createdAt: new Date(),
};

describe('Organizations Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createOrganizationHandler', () => {
    it('returns 400 if name missing', async () => {
      const req: any = { body: {} };
      const res = mockRes();
      await createOrganizationHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name is required' });
    });

    it('creates and returns an organization with auto-generated slug', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null); // slug available
      (prisma.organization.create as jest.Mock).mockResolvedValue(sampleOrg);
      const req: any = { body: { name: 'Acme Corp' } };
      const res = mockRes();

      await createOrganizationHandler(req, res);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({ where: { slug: 'acme-corp' } });
      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: { name: 'Acme Corp', slug: 'acme-corp', settings: undefined },
      });
      expect(res.json).toHaveBeenCalledWith(sampleOrg);
    });

    it('returns 409 if explicit slug already exists', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(sampleOrg); // slug taken
      const req: any = { body: { name: 'Acme Corp', slug: 'acme-corp' } };
      const res = mockRes();

      await createOrganizationHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'An organization with this slug already exists' });
    });

    it('returns 500 on database error', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.organization.create as jest.Mock).mockRejectedValue(new Error('DB fail'));
      const req: any = { body: { name: 'Acme Corp' } };
      const res = mockRes();

      await createOrganizationHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create organization' });
    });
  });

  describe('getAllOrganizationsHandler', () => {
    it('returns all organizations', async () => {
      (prisma.organization.findMany as jest.Mock).mockResolvedValue([sampleOrg]);
      const req: any = {};
      const res = mockRes();

      await getAllOrganizationsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleOrg]);
    });

    it('returns 500 on error', async () => {
      (prisma.organization.findMany as jest.Mock).mockRejectedValue(new Error('fail'));
      const req: any = {};
      const res = mockRes();

      await getAllOrganizationsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getOrganizationByIdHandler', () => {
    it('returns org when found', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(sampleOrg);
      const req: any = { params: { id: 'org-1' } };
      const res = mockRes();

      await getOrganizationByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleOrg);
    });

    it('returns 404 when not found', async () => {
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getOrganizationByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Organization not found' });
    });
  });

  describe('updateOrganizationHandler', () => {
    it('updates and returns org', async () => {
      const updated = { ...sampleOrg, name: 'Updated Corp' };
      (prisma.organization.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'org-1' }, body: { name: 'Updated Corp' } };
      const res = mockRes();

      await updateOrganizationHandler(req, res);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { name: 'Updated Corp' },
      });
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteOrganizationHandler', () => {
    it('deletes org and returns success', async () => {
      (prisma.organization.delete as jest.Mock).mockResolvedValue(sampleOrg);
      const req: any = { params: { id: 'org-1' } };
      const res = mockRes();

      await deleteOrganizationHandler(req, res);

      expect(prisma.organization.delete).toHaveBeenCalledWith({ where: { id: 'org-1' } });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Organization deleted' });
    });
  });
});
