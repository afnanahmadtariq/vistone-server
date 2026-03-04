import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { automationRulesSchema, updateAutomationRulesSchema } from "./automation-rules.schema";
import { createAutomationRuleHandler, getAllAutomationRulesHandler, getAutomationRuleByIdHandler, updateAutomationRuleHandler, deleteAutomationRuleHandler } from "./automation-rules.controller";

const router = Router();
router.post('/', validateRequest(automationRulesSchema), createAutomationRuleHandler);
router.get('/', getAllAutomationRulesHandler);
router.get('/:id', getAutomationRuleByIdHandler);
router.put('/:id', validateRequest(updateAutomationRulesSchema), updateAutomationRuleHandler);
router.delete('/:id', deleteAutomationRuleHandler);
export default router;
