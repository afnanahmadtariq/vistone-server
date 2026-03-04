import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { proposalSchema, updateProposalSchema } from "./proposals.schema";
import { createProposalHandler, getAllProposalsHandler, getProposalByIdHandler, updateProposalHandler, deleteProposalHandler } from "./proposals.controller";

const router = Router();
router.post('/', validateRequest(proposalSchema), createProposalHandler);
router.get('/', getAllProposalsHandler);
router.get('/:id', getProposalByIdHandler);
router.put('/:id', validateRequest(updateProposalSchema), updateProposalHandler);
router.delete('/:id', deleteProposalHandler);
export default router;
