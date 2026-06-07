import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { createWikiPageSchema, updateWikiPageSchema } from "./wiki-pages.schema";
import { createWikiPageHandler, getAllWikiPagesHandler, getWikiPageByIdHandler, updateWikiPageHandler, deleteWikiPageHandler } from "./wiki-pages.controller";

const router = Router();
router.post('/', validateRequest(createWikiPageSchema), createWikiPageHandler);
router.get('/', getAllWikiPagesHandler);
router.get('/:id', getWikiPageByIdHandler);
router.put('/:id', validateRequest(updateWikiPageSchema), updateWikiPageHandler);
router.delete('/:id', deleteWikiPageHandler);
export default router;
