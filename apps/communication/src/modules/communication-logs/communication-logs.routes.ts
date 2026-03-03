import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { communicationLogSchema } from "./communication-logs.schema";
import { createCommunicationLogHandler, getAllCommunicationLogsHandler, getCommunicationLogByIdHandler } from "./communication-logs.controller";

const router = Router();
router.post('/', validateRequest(communicationLogSchema), createCommunicationLogHandler);
router.get('/', getAllCommunicationLogsHandler);
router.get('/:id', getCommunicationLogByIdHandler);
export default router;
