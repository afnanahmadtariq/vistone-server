import {
  createRoleHandler,
  getRolesHandler,
  getRoleByIdHandler,
  updateRoleHandler,
  deleteRoleHandler,
  getDefinitionsHandler,
  initializeRolesHandler,
} from './roles.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    role: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationMember: {
      count: jest.fn(),
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

const sampleRole = {
  id: 'role-1',
  organizationId: 'org-1',
  name: 'Manager',
  permissions: { users: ['read'], teams: ['read', 'update'] },
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const systemRole = {
  id: 'role-sys',
  organizationId: 'org-1',
  name: 'Organizer',
  permissions: {},
  isSystem: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Roles Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ────────── getDefinitionsHandler ────────── */
  describe('getDefinitionsHandler', () => {
    it('returns all four role definitions', () => {
      const req: any = {};
      const res = mockRes();
      getDefinitionsHandler(req, res);
      expect(res.json).toHaveBeenCalled();
      const defs = (res.json as jest.Mock).mock.calls[0][0];
      expect(defs.length).toBe(4);
      expect(defs.map((d: any) => d.name).sort()).toEqual(['Client', 'Contributor', 'Manager', 'Organizer']);
    });
  });

  /* ────────── createRoleHandler ────────── */
  describe('createRoleHandler', () => {
    it('returns 400 when name is missing', async () => {
      const req: any = { body: { organizationId: 'org-1' } };
      const res = mockRes();
      await createRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Role name is required' });
    });

    it('returns 400 for invalid role name', async () => {
      const req: any = { body: { name: 'SuperAdmin', organizationId: 'org-1' } };
      const res = mockRes();
      await createRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid role name' }));
    });

    it('creates role with valid name and merges default permissions', async () => {
      (prisma.role.create as jest.Mock).mockResolvedValue(sampleRole);
      const req: any = { body: { name: 'Manager', organizationId: 'org-1' } };
      const res = mockRes();
      await createRoleHandler(req, res);
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Manager', organizationId: 'org-1' }),
      });
      expect(res.json).toHaveBeenCalledWith(sampleRole);
    });

    it('uses supplied permissions when provided', async () => {
      const customPerms = { users: ['read', 'update'] };
      (prisma.role.create as jest.Mock).mockResolvedValue({ ...sampleRole, permissions: customPerms });
      const req: any = { body: { name: 'Contributor', organizationId: 'org-1', permissions: customPerms } };
      const res = mockRes();
      await createRoleHandler(req, res);
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ permissions: customPerms }),
      });
    });

    it('returns 500 on DB error', async () => {
      (prisma.role.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: { name: 'Manager', organizationId: 'org-1' } };
      const res = mockRes();
      await createRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create role' });
    });
  });

  /* ────────── getRolesHandler ────────── */
  describe('getRolesHandler', () => {
    it('returns all roles without filter', async () => {
      (prisma.role.findMany as jest.Mock).mockResolvedValue([sampleRole]);
      const req: any = { query: {} };
      const res = mockRes();
      await getRolesHandler(req, res);
      expect(prisma.role.findMany).toHaveBeenCalledWith({ where: {}, orderBy: { name: 'asc' } });
      expect(res.json).toHaveBeenCalledWith([sampleRole]);
    });

    it('filters by organizationId', async () => {
      (prisma.role.findMany as jest.Mock).mockResolvedValue([sampleRole]);
      const req: any = { query: { organizationId: 'org-1' } };
      const res = mockRes();
      await getRolesHandler(req, res);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { name: 'asc' },
      });
    });

    it('returns 500 on error', async () => {
      (prisma.role.findMany as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { query: {} };
      const res = mockRes();
      await getRolesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── getRoleByIdHandler ────────── */
  describe('getRoleByIdHandler', () => {
    it('returns role by id', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(sampleRole);
      const req: any = { params: { id: 'role-1' } };
      const res = mockRes();
      await getRoleByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sampleRole);
    });

    it('returns 404 when not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getRoleByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Role not found' });
    });

    it('returns 500 on error', async () => {
      (prisma.role.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'role-1' } };
      const res = mockRes();
      await getRoleByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── updateRoleHandler ────────── */
  describe('updateRoleHandler', () => {
    it('returns 400 for invalid new name', async () => {
      const req: any = { params: { id: 'role-1' }, body: { name: 'InvalidName' } };
      const res = mockRes();
      await updateRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid role name' }));
    });

    it('returns 404 when role not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' }, body: { permissions: {} } };
      const res = mockRes();
      await updateRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Role not found' });
    });

    it('returns 403 when trying to rename a system role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(systemRole);
      const req: any = { params: { id: 'role-sys' }, body: { name: 'Manager' } };
      const res = mockRes();
      await updateRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Cannot rename system roles' }));
    });

    it('allows updating permissions on a system role', async () => {
      const updated = { ...systemRole, permissions: { users: ['read'] } };
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(systemRole);
      (prisma.role.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'role-sys' }, body: { permissions: { users: ['read'] } } };
      const res = mockRes();
      await updateRoleHandler(req, res);
      expect(prisma.role.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('updates and returns role (non-system)', async () => {
      const updated = { ...sampleRole, name: 'Contributor' };
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(sampleRole);
      (prisma.role.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'role-1' }, body: { name: 'Contributor' } };
      const res = mockRes();
      await updateRoleHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(sampleRole);
      (prisma.role.update as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'role-1' }, body: { permissions: {} } };
      const res = mockRes();
      await updateRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── deleteRoleHandler ────────── */
  describe('deleteRoleHandler', () => {
    it('returns 404 when role not found', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await deleteRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when deleting a system role', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(systemRole);
      const req: any = { params: { id: 'role-sys' } };
      const res = mockRes();
      await deleteRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Cannot delete system roles' }));
    });

    it('returns 400 when role is still assigned to members', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(sampleRole);
      (prisma.organizationMember.count as jest.Mock).mockResolvedValue(3);
      const req: any = { params: { id: 'role-1' } };
      const res = mockRes();
      await deleteRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Role is in use' }));
    });

    it('deletes role when valid and unassigned', async () => {
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(sampleRole);
      (prisma.organizationMember.count as jest.Mock).mockResolvedValue(0);
      (prisma.role.delete as jest.Mock).mockResolvedValue(sampleRole);
      const req: any = { params: { id: 'role-1' } };
      const res = mockRes();
      await deleteRoleHandler(req, res);
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Role deleted' });
    });

    it('returns 500 on error', async () => {
      (prisma.role.findUnique as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { id: 'role-1' } };
      const res = mockRes();
      await deleteRoleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  /* ────────── initializeRolesHandler ────────── */
  describe('initializeRolesHandler', () => {
    it('returns 400 when roles already exist', async () => {
      (prisma.role.count as jest.Mock).mockResolvedValue(3);
      const req: any = { params: { organizationId: 'org-1' } };
      const res = mockRes();
      await initializeRolesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Roles already exist' }));
    });

    it('creates default roles for organization', async () => {
      (prisma.role.count as jest.Mock).mockResolvedValue(0);
      (prisma.role.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ id: `role-${data.name}`, ...data }),
      );
      const req: any = { params: { organizationId: 'org-1' } };
      const res = mockRes();
      await initializeRolesHandler(req, res);
      // Creates 3 internal roles: Organizer, Manager, Contributor
      expect(prisma.role.create).toHaveBeenCalledTimes(3);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Default roles initialized successfully' }));
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.roles).toHaveLength(3);
    });

    it('returns 500 on error', async () => {
      (prisma.role.count as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { params: { organizationId: 'org-1' } };
      const res = mockRes();
      await initializeRolesHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
