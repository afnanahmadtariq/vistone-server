import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { upsertRiskQualityMetricsSchema } from "./risk-quality-metrics.schema";
import { getRiskQualityMetricsHandler, upsertRiskQualityMetricsHandler } from "./risk-quality-metrics.controller";

const router = Router();

router.get("/:projectId", getRiskQualityMetricsHandler);
router.put("/:projectId", validateRequest(upsertRiskQualityMetricsSchema), upsertRiskQualityMetricsHandler);

export default router;
