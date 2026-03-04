import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { notificationPreferencesSchema, updateNotificationPreferencesSchema } from "./notification-preferences.schema";
import { createNotificationPreferenceHandler, getAllNotificationPreferencesHandler, getNotificationPreferenceByIdHandler, updateNotificationPreferenceHandler, deleteNotificationPreferenceHandler } from "./notification-preferences.controller";

const router = Router();
router.post('/', validateRequest(notificationPreferencesSchema), createNotificationPreferenceHandler);
router.get('/', getAllNotificationPreferencesHandler);
router.get('/:id', getNotificationPreferenceByIdHandler);
router.put('/:id', validateRequest(updateNotificationPreferencesSchema), updateNotificationPreferenceHandler);
router.delete('/:id', deleteNotificationPreferenceHandler);
export default router;
