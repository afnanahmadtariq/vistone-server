import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { kpiDefinitionsSchema, updateKpiDefinitionsSchema } from "./kpi-definitions.schema";
import { createKpiDefinitionHandler, getAllKpiDefinitionsHandler, getKpiDefinitionByIdHandler, updateKpiDefinitionHandler, deleteKpiDefinitionHandler } from "./kpi-definitions.controller";

const router = Router();
router.post('/', validateRequest(kpiDefinitionsSchema), createKpiDefinitionHandler);
router.get('/', getAllKpiDefinitionsHandler);
router.get('/:id', getKpiDefinitionByIdHandler);
router.put('/:id', validateRequest(updateKpiDefinitionsSchema), updateKpiDefinitionHandler);
router.delete('/:id', deleteKpiDefinitionHandler);
export default router;
