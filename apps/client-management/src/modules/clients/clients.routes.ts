import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { clientSchema, updateClientSchema } from "./clients.schema";
import { createClientHandler, getAllClientsHandler, getClientByIdHandler, updateClientHandler, deleteClientHandler } from "./clients.controller";

const router = Router();
router.post('/', validateRequest(clientSchema), createClientHandler);
router.get('/', getAllClientsHandler);
router.get('/:id', getClientByIdHandler);
router.put('/:id', validateRequest(updateClientSchema), updateClientHandler);
router.delete('/:id', deleteClientHandler);
export default router;
