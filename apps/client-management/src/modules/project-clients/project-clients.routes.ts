import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { projectClientSchema, updateProjectClientSchema } from "./project-clients.schema";
import { createProjectClientHandler, getAllProjectClientsHandler, getProjectClientByIdHandler, updateProjectClientHandler, deleteProjectClientHandler } from "./project-clients.controller";

const router = Router();
router.post('/', validateRequest(projectClientSchema), createProjectClientHandler);
router.get('/', getAllProjectClientsHandler);
router.get('/:id', getProjectClientByIdHandler);
router.put('/:id', validateRequest(updateProjectClientSchema), updateProjectClientHandler);
router.delete('/:id', deleteProjectClientHandler);
export default router;
