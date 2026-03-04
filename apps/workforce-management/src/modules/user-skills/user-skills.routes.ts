import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { userSkillsSchema, updateUserSkillsSchema } from "./user-skills.schema";
import { createUserSkillHandler, getAllUserSkillsHandler, getUserSkillByIdHandler, updateUserSkillHandler, deleteUserSkillHandler } from "./user-skills.controller";

const router = Router();
router.post('/', validateRequest(userSkillsSchema), createUserSkillHandler);
router.get('/', getAllUserSkillsHandler);
router.get('/:id', getUserSkillByIdHandler);
router.put('/:id', validateRequest(updateUserSkillsSchema), updateUserSkillHandler);
router.delete('/:id', deleteUserSkillHandler);
export default router;
