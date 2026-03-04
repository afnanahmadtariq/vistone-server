import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { notificationsSchema, updateNotificationsSchema } from "./notifications.schema";
import { createNotificationHandler, getAllNotificationsHandler, getNotificationByIdHandler, updateNotificationMarkAsReadEtcHandler, deleteNotificationHandler, getNotificationsByUserHandler, markAllNotificationsAsReadForUserHandler } from "./notifications.controller";

const router = Router();
router.post('/', validateRequest(notificationsSchema), createNotificationHandler);
router.get('/', getAllNotificationsHandler);
router.get('/:id', getNotificationByIdHandler);
router.put('/:id', validateRequest(updateNotificationsSchema), updateNotificationMarkAsReadEtcHandler);
router.delete('/:id', deleteNotificationHandler);
router.get('/user/:userId', getNotificationsByUserHandler);
router.put('/user/:userId/read-all', validateRequest(updateNotificationsSchema), markAllNotificationsAsReadForUserHandler);
export default router;
