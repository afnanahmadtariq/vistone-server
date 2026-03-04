import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { automationLogsSchema } from "./automation-logs.schema";
import { createAutomationLogHandler, getAllAutomationLogsHandler, getAutomationLogByIdHandler } from "./automation-logs.controller";

const router = Router();
router.post('/', validateRequest(automationLogsSchema), createAutomationLogHandler);
router.get('/', getAllAutomationLogsHandler);
router.get('/:id', getAutomationLogByIdHandler);
export default router;
