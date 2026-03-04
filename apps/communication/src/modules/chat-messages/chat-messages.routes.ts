import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { chatMessageSchema, updateChatMessageSchema } from "./chat-messages.schema";
import { createChatMessageHandler, getAllChatMessagesHandler, getChatMessageByIdHandler, updateChatMessageHandler, deleteChatMessageHandler } from "./chat-messages.controller";

const router = Router();
router.post('/', validateRequest(chatMessageSchema), createChatMessageHandler);
router.get('/', getAllChatMessagesHandler);
router.get('/:id', getChatMessageByIdHandler);
router.put('/:id', validateRequest(updateChatMessageSchema), updateChatMessageHandler);
router.delete('/:id', deleteChatMessageHandler);
export default router;
