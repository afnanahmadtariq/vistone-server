import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { organizationSchema, updateOrganizationSchema } from "./organizations.schema";
import { createOrganizationHandler, getAllOrganizationsHandler, getOrganizationByIdHandler, updateOrganizationHandler, deleteOrganizationHandler } from "./organizations.controller";

const router = Router();
router.post('/', validateRequest(organizationSchema), createOrganizationHandler);
router.get('/', getAllOrganizationsHandler);
router.get('/:id', getOrganizationByIdHandler);
router.put('/:id', validateRequest(updateOrganizationSchema), updateOrganizationHandler);
router.delete('/:id', deleteOrganizationHandler);
export default router;
