import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { chatChannelSchema, updateChatChannelSchema } from "./chat-channels.schema";
import { createChatChannelHandler, getAllChatChannelsHandler, getChatChannelByIdHandler, updateChatChannelHandler, deleteChatChannelHandler } from "./chat-channels.controller";

const router = Router();
router.post('/', validateRequest(chatChannelSchema), createChatChannelHandler);
router.get('/', getAllChatChannelsHandler);
router.get('/:id', getChatChannelByIdHandler);
router.put('/:id', validateRequest(updateChatChannelSchema), updateChatChannelHandler);
router.delete('/:id', deleteChatChannelHandler);
export default router;
