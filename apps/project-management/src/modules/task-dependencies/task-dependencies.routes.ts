import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { taskDependencySchema, updateTaskDependencySchema } from "./task-dependencies.schema";
import { createTaskDependencyHandler, getAllTaskDependenciesHandler, getTaskDependencyByIdHandler, updateTaskDependencyHandler, deleteTaskDependencyHandler } from "./task-dependencies.controller";

const router = Router();
router.post('/', validateRequest(taskDependencySchema), createTaskDependencyHandler);
router.get('/', getAllTaskDependenciesHandler);
router.get('/:id', getTaskDependencyByIdHandler);
router.put('/:id', validateRequest(updateTaskDependencySchema), updateTaskDependencyHandler);
router.delete('/:id', deleteTaskDependencyHandler);
export default router;
