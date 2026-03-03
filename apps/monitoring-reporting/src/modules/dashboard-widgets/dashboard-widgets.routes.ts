import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { dashboardWidgetsSchema, updateDashboardWidgetsSchema } from "./dashboard-widgets.schema";
import { createDashboardWidgetHandler, getAllDashboardWidgetsHandler, getDashboardWidgetByIdHandler, updateDashboardWidgetHandler, deleteDashboardWidgetHandler } from "./dashboard-widgets.controller";

const router = Router();
router.post('/', validateRequest(dashboardWidgetsSchema), createDashboardWidgetHandler);
router.get('/', getAllDashboardWidgetsHandler);
router.get('/:id', getDashboardWidgetByIdHandler);
router.put('/:id', validateRequest(updateDashboardWidgetsSchema), updateDashboardWidgetHandler);
router.delete('/:id', deleteDashboardWidgetHandler);
export default router;
