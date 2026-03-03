import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { riskRegisterSchema, updateRiskRegisterSchema } from "./risk-register.schema";
import { createRiskRegisterHandler, getAllRiskRegistersHandler, getRiskRegisterByIdHandler, updateRiskRegisterHandler, deleteRiskRegisterHandler } from "./risk-register.controller";

const router = Router();
router.post('/', validateRequest(riskRegisterSchema), createRiskRegisterHandler);
router.get('/', getAllRiskRegistersHandler);
router.get('/:id', getRiskRegisterByIdHandler);
router.put('/:id', validateRequest(updateRiskRegisterSchema), updateRiskRegisterHandler);
router.delete('/:id', deleteRiskRegisterHandler);
export default router;
