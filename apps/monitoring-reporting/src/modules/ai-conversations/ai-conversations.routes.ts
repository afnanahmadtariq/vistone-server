import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { aiConversationsSchema, updateAiConversationsSchema } from "./ai-conversations.schema";
import { createAiConversationHandler, getAllAiConversationsHandler, getAiConversationByIdHandler, updateAiConversationHandler, deleteAiConversationHandler } from "./ai-conversations.controller";

const router = Router();
router.post('/', validateRequest(aiConversationsSchema), createAiConversationHandler);
router.get('/', getAllAiConversationsHandler);
router.get('/:id', getAiConversationByIdHandler);
router.put('/:id', validateRequest(updateAiConversationsSchema), updateAiConversationHandler);
router.delete('/:id', deleteAiConversationHandler);
export default router;
