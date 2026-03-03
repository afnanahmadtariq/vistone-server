import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { generatedReportsSchema } from "./generated-reports.schema";
import { createGeneratedReportHandler, getAllGeneratedReportsHandler, getGeneratedReportByIdHandler } from "./generated-reports.controller";

const router = Router();
router.post('/', validateRequest(generatedReportsSchema), createGeneratedReportHandler);
router.get('/', getAllGeneratedReportsHandler);
router.get('/:id', getGeneratedReportByIdHandler);
export default router;
