import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { teamsSchema, updateTeamsSchema } from "./teams.schema";
import { createTeamHandler, getAllTeamsHandler, getTeamByIdHandler, updateTeamHandler, deleteTeamHandler, removeMemberFromTeamHandler } from "./teams.controller";

const router = Router();
router.post('/', validateRequest(teamsSchema), createTeamHandler);
router.get('/', getAllTeamsHandler);
router.get('/:id', getTeamByIdHandler);
router.put('/:id', validateRequest(updateTeamsSchema), updateTeamHandler);
router.delete('/:id', deleteTeamHandler);
router.post('/remove-member', validateRequest(teamsSchema), removeMemberFromTeamHandler);
export default router;
