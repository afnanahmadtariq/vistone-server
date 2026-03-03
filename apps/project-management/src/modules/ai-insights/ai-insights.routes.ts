import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { aiInsightSchema } from "./ai-insights.schema";
import { updateAiInsightIsnTPhysicallyInAiInsightsTsBasedOnEarlierSnippetButIfWeNeedASchemaWeCanAddItCreateAiInsightHandler, getAllAiInsightsHandler, getAiInsightByIdHandler } from "./ai-insights.controller";

const router = Router();
router.post('/', validateRequest(aiInsightSchema), updateAiInsightIsnTPhysicallyInAiInsightsTsBasedOnEarlierSnippetButIfWeNeedASchemaWeCanAddItCreateAiInsightHandler);
router.get('/', getAllAiInsightsHandler);
router.get('/:id', getAiInsightByIdHandler);
export default router;
