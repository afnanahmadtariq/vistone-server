import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { documentLinksSchema, updateDocumentLinksSchema } from "./document-links.schema";
import { createDocumentLinkHandler, getAllDocumentLinksHandler, getDocumentLinkByIdHandler, updateDocumentLinkHandler, deleteDocumentLinkHandler } from "./document-links.controller";

const router = Router();
router.post('/', validateRequest(documentLinksSchema), createDocumentLinkHandler);
router.get('/', getAllDocumentLinksHandler);
router.get('/:id', getDocumentLinkByIdHandler);
router.put('/:id', validateRequest(updateDocumentLinksSchema), updateDocumentLinkHandler);
router.delete('/:id', deleteDocumentLinkHandler);
export default router;
