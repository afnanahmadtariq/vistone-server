import { Router } from 'express';
import prisma from '../lib/prisma';
import {
  ROLE_NAMES,
  isValidRole,
  getRoleDefinition,
  getAllRoleNames,
  RoleName,
} from '../lib/roles';

const router = Router();

/**
 * Role Management Routes
 *
 * Enforces the 4 valid role types as per BACKEND_IMPLEMENTATION_PLAN.md:
 * - Organizer (Internal): Full system access
 * - Manager (Internal): Team management
 * - Contributor (Internal): Team member
 * - Client (External): Portal access
 */

// Get all available role definitions (static)
router.get('/definitions', (_req, res) => {
  try {
    const roleDefinitions = getAllRoleNames().map((name) => getRoleDefinition(name));
    res.json(roleDefinitions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch role definitions' });
  }
});

// Create Role
router.post('/', async (req, res) => {
  try {
    const { name, organizationId, permissions, isSystem } = req.body;

    // Validate role name
    if (!name) {
      res.status(400).json({ error: 'Role name is required' });
      return;
    }

    if (!isValidRole(name)) {
      res.status(400).json({
        error: 'Invalid role name',
        message: `Role name must be one of: ${getAllRoleNames().join(', ')}`,
        validRoles: getAllRoleNames(),
      });
      return;
    }

    // Get the role definition for default permissions if not provided
    const roleDefinition = getRoleDefinition(name);
    const finalPermissions = permissions || roleDefinition?.permissions || {};

    const role = await prisma.role.create({
      data: {
        name,
        organizationId,
        permissions: finalPermissions,
        isSystem: isSystem ?? roleDefinition?.isSystem ?? false,
      },
    });

    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Get all Roles for an organization
router.get('/', async (req, res) => {
  try {
    const { organizationId } = req.query;

    const whereClause = organizationId
      ? { organizationId: organizationId as string }
      : {};

    const roles = await prisma.role.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get Role by ID
router.get('/:id', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!role) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Update Role
router.put('/:id', async (req, res) => {
  try {
    const { name, permissions, isSystem } = req.body;

    // If name is being updated, validate it
    if (name && !isValidRole(name)) {
      res.status(400).json({
        error: 'Invalid role name',
        message: `Role name must be one of: ${getAllRoleNames().join(', ')}`,
        validRoles: getAllRoleNames(),
      });
      return;
    }

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!existingRole) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    // Prevent modification of system roles (except permissions customization)
    if (existingRole.isSystem && name && name !== existingRole.name) {
      res.status(403).json({
        error: 'Cannot rename system roles',
        message: 'System roles cannot be renamed. You can only customize their permissions.',
      });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isSystem !== undefined) updateData.isSystem = isSystem;

    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(role);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete Role
router.delete('/:id', async (req, res) => {
  try {
    // Check if role exists and is not a system role
    const existingRole = await prisma.role.findUnique({
      where: { id: req.params.id },
    });

    if (!existingRole) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    if (existingRole.isSystem) {
      res.status(403).json({
        error: 'Cannot delete system roles',
        message: 'System roles (Organizer, Manager, Contributor, Client) cannot be deleted.',
      });
      return;
    }

    // Check if role is assigned to any members
    const membersWithRole = await prisma.organizationMember.count({
      where: { roleId: req.params.id },
    });

    if (membersWithRole > 0) {
      res.status(400).json({
        error: 'Role is in use',
        message: `This role is assigned to ${membersWithRole} member(s). Reassign them before deleting.`,
      });
      return;
    }

    await prisma.role.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Role deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Initialize default roles for an organization
router.post('/initialize/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Check if organization already has roles
    const existingRoles = await prisma.role.count({
      where: { organizationId },
    });

    if (existingRoles > 0) {
      res.status(400).json({
        error: 'Roles already exist',
        message: 'This organization already has roles configured.',
      });
      return;
    }

    // Create the 3 internal roles (Client is typically created via client-management service)
    const internalRoles: RoleName[] = [
      ROLE_NAMES.ORGANIZER,
      ROLE_NAMES.MANAGER,
      ROLE_NAMES.CONTRIBUTOR,
    ];

    const createdRoles = [];

    for (const roleName of internalRoles) {
      const roleDefinition = getRoleDefinition(roleName);
      if (roleDefinition) {
        const role = await prisma.role.create({
          data: {
            organizationId,
            name: roleDefinition.name,
            permissions: roleDefinition.permissions,
            isSystem: roleDefinition.isSystem,
          },
        });
        createdRoles.push(role);
      }
    }

    res.json({
      message: 'Default roles initialized successfully',
      roles: createdRoles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initialize roles' });
  }
});

export default router;

