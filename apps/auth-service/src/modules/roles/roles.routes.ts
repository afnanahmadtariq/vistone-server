import { Router } from 'express';
import { validateRequest } from '../../lib/validate';
import { roleSchema, updateRoleSchema } from './roles.schema';
import {
    getDefinitionsHandler,
    createRoleHandler,
    getRolesHandler,
    getRoleByIdHandler,
    updateRoleHandler,
    deleteRoleHandler,
    initializeRolesHandler,
} from './roles.controller';

const router = Router();

router.get('/definitions', getDefinitionsHandler);
router.post('/', validateRequest(roleSchema), createRoleHandler);
router.get('/', getRolesHandler);
router.get('/:id', getRoleByIdHandler);
router.put('/:id', validateRequest(updateRoleSchema), updateRoleHandler);
router.delete('/:id', deleteRoleHandler);
router.post('/initialize/:organizationId', initializeRolesHandler);

export default router;
