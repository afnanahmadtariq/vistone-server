import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { milestoneSchema, updateMilestoneSchema } from "./milestones.schema";
import { createMilestoneHandler, getAllMilestonesHandler, getMilestoneByIdHandler, updateMilestoneHandler, deleteMilestoneHandler } from "./milestones.controller";

const router = Router();
router.post('/', validateRequest(milestoneSchema), createMilestoneHandler);
router.get('/', getAllMilestonesHandler);
router.get('/:id', getMilestoneByIdHandler);
router.put('/:id', validateRequest(updateMilestoneSchema), updateMilestoneHandler);
router.delete('/:id', deleteMilestoneHandler);
export default router;
