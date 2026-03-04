import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import {
    ROLE_NAMES,
    isValidRole,
    getRoleDefinition,
    getAllRoleNames,
    RoleName,
} from '../../lib/roles';

export const getDefinitionsHandler = (_req: Request, res: Response) => {
    try {
        const roleDefinitions = getAllRoleNames().map((name) => getRoleDefinition(name as RoleName));
        res.json(roleDefinitions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch role definitions' });
    }
};

export const createRoleHandler = async (req: Request, res: Response) => {
    try {
        const { name, organizationId, permissions, isSystem } = req.body;

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

        const roleDefinition = getRoleDefinition(name as RoleName);
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
};

export const getRolesHandler = async (req: Request, res: Response) => {
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
};

export const getRoleByIdHandler = async (req: Request, res: Response) => {
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
};

export const updateRoleHandler = async (req: Request, res: Response) => {
    try {
        const { name, permissions, isSystem } = req.body;

        if (name && !isValidRole(name)) {
            res.status(400).json({
                error: 'Invalid role name',
                message: `Role name must be one of: ${getAllRoleNames().join(', ')}`,
                validRoles: getAllRoleNames(),
            });
            return;
        }

        const existingRole = await prisma.role.findUnique({
            where: { id: req.params.id },
        });

        if (!existingRole) {
            res.status(404).json({ error: 'Role not found' });
            return;
        }

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
            data: updateData as any,
        });

        res.json(role);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update role' });
    }
};

export const deleteRoleHandler = async (req: Request, res: Response) => {
    try {
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

        res.json({ success: true, message: 'Role deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
};

export const initializeRolesHandler = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;

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
                    } as any,
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
};
