import {
  createOrganizationMemberHandler,
  getAllOrganizationMembersHandler,
  getOrganizationMemberByIdHandler,
  updateOrganizationMemberHandler,
  deleteOrganizationMemberHandler,
} from './organization-members.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    organizationMember: {
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

const sampleMember = {
  id: 'mem-1',
  organizationId: 'org-1',
  userId: 'user-1',
  roleId: 'role-1',
  createdAt: new Date(),
};

describe('OrganizationMembers Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createOrganizationMemberHandler', () => {
    it('creates and returns a member', async () => {
      (prisma.organizationMember.create as jest.Mock).mockResolvedValue(sampleMember);
      const req: any = { body: { organizationId: 'org-1', userId: 'user-1' } };
      const res = mockRes();

      await createOrganizationMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleMember);
    });

    it('returns 500 on error', async () => {
      (prisma.organizationMember.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createOrganizationMemberHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllOrganizationMembersHandler', () => {
    it('returns all members', async () => {
      (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([sampleMember]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllOrganizationMembersHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleMember]);
    });
  });

  describe('getOrganizationMemberByIdHandler', () => {
    it('returns member by id', async () => {
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(sampleMember);
      const req: any = { params: { id: 'mem-1' } };
      const res = mockRes();

      await getOrganizationMemberByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleMember);
    });

    it('returns 404 when not found', async () => {
      (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getOrganizationMemberByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateOrganizationMemberHandler', () => {
    it('updates and returns member', async () => {
      const updated = { ...sampleMember, roleId: 'role-2' };
      (prisma.organizationMember.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'mem-1' }, body: { roleId: 'role-2' } };
      const res = mockRes();

      await updateOrganizationMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteOrganizationMemberHandler', () => {
    it('deletes member and returns success', async () => {
      (prisma.organizationMember.delete as jest.Mock).mockResolvedValue(sampleMember);
      const req: any = { params: { id: 'mem-1' } };
      const res = mockRes();

      await deleteOrganizationMemberHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
