import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { kpiMeasurementsSchema } from "./kpi-measurements.schema";
import { createKpiMeasurementHandler, getAllKpiMeasurementsHandler, getKpiMeasurementByIdHandler } from "./kpi-measurements.controller";

const router = Router();
router.post('/', validateRequest(kpiMeasurementsSchema), createKpiMeasurementHandler);
router.get('/', getAllKpiMeasurementsHandler);
router.get('/:id', getKpiMeasurementByIdHandler);
export default router;
