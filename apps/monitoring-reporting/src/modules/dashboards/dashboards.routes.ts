import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { dashboardsSchema, updateDashboardsSchema } from "./dashboards.schema";
import { createDashboardHandler, getAllDashboardsHandler, getDashboardByIdHandler, updateDashboardHandler, deleteDashboardHandler } from "./dashboards.controller";

const router = Router();
router.post('/', validateRequest(dashboardsSchema), createDashboardHandler);
router.get('/', getAllDashboardsHandler);
router.get('/:id', getDashboardByIdHandler);
router.put('/:id', validateRequest(updateDashboardsSchema), updateDashboardHandler);
router.delete('/:id', deleteDashboardHandler);
export default router;
