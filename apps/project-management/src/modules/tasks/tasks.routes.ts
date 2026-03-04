import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { taskSchema, updateTaskSchema } from "./tasks.schema";
import { createTaskHandler, getAllTasksHandler, getTaskByIdHandler, updateTaskHandler, deleteTaskHandler } from "./tasks.controller";

const router = Router();
router.post('/', validateRequest(taskSchema), createTaskHandler);
router.get('/', getAllTasksHandler);
router.get('/:id', getTaskByIdHandler);
router.put('/:id', validateRequest(updateTaskSchema), updateTaskHandler);
router.delete('/:id', deleteTaskHandler);
export default router;
