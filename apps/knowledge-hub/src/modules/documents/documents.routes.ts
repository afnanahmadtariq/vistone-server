import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { documentsSchema, updateDocumentsSchema } from "./documents.schema";
import { createDocumentHandler, getAllDocumentsHandler, getDocumentByIdHandler, updateDocumentHandler, deleteDocumentHandler } from "./documents.controller";

const router = Router();
router.post('/', validateRequest(documentsSchema), createDocumentHandler);
router.get('/', getAllDocumentsHandler);
router.get('/:id', getDocumentByIdHandler);
router.put('/:id', validateRequest(updateDocumentsSchema), updateDocumentHandler);
router.delete('/:id', deleteDocumentHandler);
export default router;
