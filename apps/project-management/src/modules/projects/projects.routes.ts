import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { projectSchema, updateProjectSchema } from "./projects.schema";
import { createProjectHandler, getAllProjectsHandler, getProjectByIdHandler, updateProjectHandler, deleteProjectHandler } from "./projects.controller";

const router = Router();
router.post('/', validateRequest(projectSchema), createProjectHandler);
router.get('/', getAllProjectsHandler);
router.get('/:id', getProjectByIdHandler);
router.put('/:id', validateRequest(updateProjectSchema), updateProjectHandler);
router.delete('/:id', deleteProjectHandler);
export default router;
