import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { projectMemberSchema, updateProjectMemberSchema } from "./project-members.schema";
import { createProjectMemberHandler, getAllProjectMembersHandler, getProjectMemberByIdHandler, updateProjectMemberHandler, deleteProjectMemberHandler } from "./project-members.controller";

const router = Router();
router.post('/', validateRequest(projectMemberSchema), createProjectMemberHandler);
router.get('/', getAllProjectMembersHandler);
router.get('/:id', getProjectMemberByIdHandler);
router.put('/:id', validateRequest(updateProjectMemberSchema), updateProjectMemberHandler);
router.delete('/:id', deleteProjectMemberHandler);
export default router;
