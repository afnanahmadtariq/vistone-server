import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { documentFoldersSchema, updateDocumentFoldersSchema } from "./document-folders.schema";
import { createDocumentFolderHandler, getAllDocumentFoldersHandler, getDocumentFolderByIdHandler, updateDocumentFolderHandler, deleteDocumentFolderHandler } from "./document-folders.controller";

const router = Router();
router.post('/', validateRequest(documentFoldersSchema), createDocumentFolderHandler);
router.get('/', getAllDocumentFoldersHandler);
router.get('/:id', getDocumentFolderByIdHandler);
router.put('/:id', validateRequest(updateDocumentFoldersSchema), updateDocumentFolderHandler);
router.delete('/:id', deleteDocumentFolderHandler);
export default router;
