import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { wikiPageVersionsSchema } from "./wiki-page-versions.schema";
import { createWikiPageVersionHandler, getAllWikiPageVersionsHandler, getWikiPageVersionByIdHandler } from "./wiki-page-versions.controller";

const router = Router();
router.post('/', validateRequest(wikiPageVersionsSchema), createWikiPageVersionHandler);
router.get('/', getAllWikiPageVersionsHandler);
router.get('/:id', getWikiPageVersionByIdHandler);
export default router;
