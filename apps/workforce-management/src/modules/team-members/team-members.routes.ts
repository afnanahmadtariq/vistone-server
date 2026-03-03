import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { teamMembersSchema, updateTeamMembersSchema } from "./team-members.schema";
import { createTeamMemberHandler, getAllTeamMembersHandler, getTeamMemberByIdHandler, updateTeamMemberHandler, deleteTeamMemberHandler } from "./team-members.controller";

const router = Router();
router.post('/', validateRequest(teamMembersSchema), createTeamMemberHandler);
router.get('/', getAllTeamMembersHandler);
router.get('/:id', getTeamMemberByIdHandler);
router.put('/:id', validateRequest(updateTeamMembersSchema), updateTeamMemberHandler);
router.delete('/:id', deleteTeamMemberHandler);
export default router;
