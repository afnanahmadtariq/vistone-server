import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { messageMentionSchema } from "./message-mentions.schema";
import { createMessageMentionHandler, getAllMessageMentionsHandler, getMessageMentionByIdHandler } from "./message-mentions.controller";

const router = Router();
router.post('/', validateRequest(messageMentionSchema), createMessageMentionHandler);
router.get('/', getAllMessageMentionsHandler);
router.get('/:id', getMessageMentionByIdHandler);
export default router;
