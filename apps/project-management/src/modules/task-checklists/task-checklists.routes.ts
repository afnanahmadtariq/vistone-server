import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { taskChecklistSchema, updateTaskChecklistSchema } from "./task-checklists.schema";
import { createTaskChecklistHandler, getAllTaskChecklistsHandler, getTaskChecklistByIdHandler, updateTaskChecklistHandler, deleteTaskChecklistHandler } from "./task-checklists.controller";

const router = Router();
router.post('/', validateRequest(taskChecklistSchema), createTaskChecklistHandler);
router.get('/', getAllTaskChecklistsHandler);
router.get('/:id', getTaskChecklistByIdHandler);
router.put('/:id', validateRequest(updateTaskChecklistSchema), updateTaskChecklistHandler);
router.delete('/:id', deleteTaskChecklistHandler);
export default router;
