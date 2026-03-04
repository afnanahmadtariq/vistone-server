import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { notificationTemplatesSchema, updateNotificationTemplatesSchema } from "./notification-templates.schema";
import { createNotificationTemplateHandler, getAllNotificationTemplatesHandler, getNotificationTemplateByIdHandler, updateNotificationTemplateHandler, deleteNotificationTemplateHandler } from "./notification-templates.controller";

const router = Router();
router.post('/', validateRequest(notificationTemplatesSchema), createNotificationTemplateHandler);
router.get('/', getAllNotificationTemplatesHandler);
router.get('/:id', getNotificationTemplateByIdHandler);
router.put('/:id', validateRequest(updateNotificationTemplatesSchema), updateNotificationTemplateHandler);
router.delete('/:id', deleteNotificationTemplateHandler);
export default router;
