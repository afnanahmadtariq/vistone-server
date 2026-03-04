import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { mfaSettingSchema, updateMfaSettingSchema } from "./mfa-settings.schema";
import { createMfaSettingHandler, getAllMfaSettingsHandler, getMfaSettingByIdHandler, updateMfaSettingHandler, deleteMfaSettingHandler } from "./mfa-settings.controller";

const router = Router();
router.post('/', validateRequest(mfaSettingSchema), createMfaSettingHandler);
router.get('/', getAllMfaSettingsHandler);
router.get('/:id', getMfaSettingByIdHandler);
router.put('/:id', validateRequest(updateMfaSettingSchema), updateMfaSettingHandler);
router.delete('/:id', deleteMfaSettingHandler);
export default router;
