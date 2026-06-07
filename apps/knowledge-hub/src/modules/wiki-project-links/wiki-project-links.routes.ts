import { Router } from 'express';
import {
    createWikiProjectLink,
    getWikiProjectLinks,
    deleteWikiProjectLink
} from './wiki-project-links.controller';
import { validateRequest } from '../../lib/validate';
import { createLinkSchema } from './wiki-project-links.schema';

const router = Router();

router.post('/', validateRequest(createLinkSchema), createWikiProjectLink);
router.get('/', getWikiProjectLinks);
router.delete('/:id', deleteWikiProjectLink);

export default router;
