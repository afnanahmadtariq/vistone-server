import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { reportScheduleSchema, updateReportScheduleSchema } from "./report-schedules.schema";
import { createReportScheduleHandler, getAllReportSchedulesHandler, getReportScheduleByIdHandler, updateReportScheduleHandler, deleteReportScheduleHandler } from "./report-schedules.controller";

const router = Router();
router.post('/', validateRequest(reportScheduleSchema), createReportScheduleHandler);
router.get('/', getAllReportSchedulesHandler);
router.get('/:id', getReportScheduleByIdHandler);
router.put('/:id', validateRequest(updateReportScheduleSchema), updateReportScheduleHandler);
router.delete('/:id', deleteReportScheduleHandler);
export default router;
