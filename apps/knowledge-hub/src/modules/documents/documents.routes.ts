import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { createDocumentSchema, updateDocumentSchema } from "./documents.schema";
import { createDocumentHandler, getAllDocumentsHandler, getDocumentByIdHandler, getDocumentVersionsHandler, updateDocumentHandler, deleteDocumentHandler } from "./documents.controller";

const router = Router();
router.post('/', validateRequest(createDocumentSchema), createDocumentHandler);
router.get('/', getAllDocumentsHandler);
router.get('/:id/versions', getDocumentVersionsHandler);
router.get('/:id', getDocumentByIdHandler);
router.put('/:id', validateRequest(updateDocumentSchema), updateDocumentHandler);
router.delete('/:id', deleteDocumentHandler);
export default router;
