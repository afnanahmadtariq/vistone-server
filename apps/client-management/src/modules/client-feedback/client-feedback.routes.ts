import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { clientFeedbackSchema, updateClientFeedbackSchema } from "./client-feedback.schema";
import { createClientFeedbackHandler, getAllClientFeedbacksHandler, getClientFeedbackByIdHandler, updateClientFeedbackHandler, deleteClientFeedbackHandler } from "./client-feedback.controller";

const router = Router();
router.post('/', validateRequest(clientFeedbackSchema), createClientFeedbackHandler);
router.get('/', getAllClientFeedbacksHandler);
router.get('/:id', getClientFeedbackByIdHandler);
router.put('/:id', validateRequest(updateClientFeedbackSchema), updateClientFeedbackHandler);
router.delete('/:id', deleteClientFeedbackHandler);
export default router;
