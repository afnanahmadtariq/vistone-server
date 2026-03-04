import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { activityLogSchema } from "./activity-logs.schema";
import { createActivityLogHandler, getAllActivityLogsHandler, getActivityLogByIdHandler } from "./activity-logs.controller";

const router = Router();
router.post('/', validateRequest(activityLogSchema), createActivityLogHandler);
router.get('/', getAllActivityLogsHandler);
router.get('/:id', getActivityLogByIdHandler);
export default router;
