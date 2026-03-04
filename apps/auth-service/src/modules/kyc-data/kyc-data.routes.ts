import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { kycDataSchema, updateKycDataSchema } from "./kyc-data.schema";
import { createKycDataHandler, getAllKycDataHandler, getKycDataByIdHandler, updateKycDataHandler, deleteKycDataHandler } from "./kyc-data.controller";

const router = Router();
router.post('/', validateRequest(kycDataSchema), createKycDataHandler);
router.get('/', getAllKycDataHandler);
router.get('/:id', getKycDataByIdHandler);
router.put('/:id', validateRequest(updateKycDataSchema), updateKycDataHandler);
router.delete('/:id', deleteKycDataHandler);
export default router;
