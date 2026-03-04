import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { organizationMemberSchema, updateOrganizationMemberSchema } from "./organization-members.schema";
import { createOrganizationMemberHandler, getAllOrganizationMembersHandler, getOrganizationMemberByIdHandler, updateOrganizationMemberHandler, deleteOrganizationMemberHandler } from "./organization-members.controller";

const router = Router();
router.post('/', validateRequest(organizationMemberSchema), createOrganizationMemberHandler);
router.get('/', getAllOrganizationMembersHandler);
router.get('/:id', getOrganizationMemberByIdHandler);
router.put('/:id', validateRequest(updateOrganizationMemberSchema), updateOrganizationMemberHandler);
router.delete('/:id', deleteOrganizationMemberHandler);
export default router;
