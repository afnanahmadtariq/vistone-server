import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { messageAttachmentSchema } from "./message-attachments.schema";
import { createMessageAttachmentHandler, getAllMessageAttachmentsHandler, getMessageAttachmentByIdHandler } from "./message-attachments.controller";

const router = Router();
router.post('/', validateRequest(messageAttachmentSchema), createMessageAttachmentHandler);
router.get('/', getAllMessageAttachmentsHandler);
router.get('/:id', getMessageAttachmentByIdHandler);
export default router;
