import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { reportTemplatesSchema, updateReportTemplatesSchema } from "./report-templates.schema";
import { createReportTemplateHandler, getAllReportTemplatesHandler, getReportTemplateByIdHandler, updateReportTemplateHandler, deleteReportTemplateHandler } from "./report-templates.controller";

const router = Router();
router.post('/', validateRequest(reportTemplatesSchema), createReportTemplateHandler);
router.get('/', getAllReportTemplatesHandler);
router.get('/:id', getReportTemplateByIdHandler);
router.put('/:id', validateRequest(updateReportTemplatesSchema), updateReportTemplateHandler);
router.delete('/:id', deleteReportTemplateHandler);
export default router;
