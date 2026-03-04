import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { aiInsightSchema, updateAiInsightSchema } from "./ai-insights.schema";
import { createAiInsightHandler, getAllAiInsightsHandler, getAiInsightByIdHandler, updateAiInsightHandler, deleteAiInsightHandler } from "./ai-insights.controller";

const router = Router();
router.post('/', validateRequest(aiInsightSchema), createAiInsightHandler);
router.get('/', getAllAiInsightsHandler);
router.get('/:id', getAiInsightByIdHandler);
router.put('/:id', validateRequest(updateAiInsightSchema), updateAiInsightHandler);
router.delete('/:id', deleteAiInsightHandler);
export default router;
