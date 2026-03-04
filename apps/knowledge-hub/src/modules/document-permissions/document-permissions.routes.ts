import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { documentPermissionsSchema, updateDocumentPermissionsSchema } from "./document-permissions.schema";
import { createDocumentPermissionHandler, getAllDocumentPermissionsHandler, getDocumentPermissionByIdHandler, updateDocumentPermissionHandler, deleteDocumentPermissionHandler } from "./document-permissions.controller";

const router = Router();
router.post('/', validateRequest(documentPermissionsSchema), createDocumentPermissionHandler);
router.get('/', getAllDocumentPermissionsHandler);
router.get('/:id', getDocumentPermissionByIdHandler);
router.put('/:id', validateRequest(updateDocumentPermissionsSchema), updateDocumentPermissionHandler);
router.delete('/:id', deleteDocumentPermissionHandler);
export default router;
