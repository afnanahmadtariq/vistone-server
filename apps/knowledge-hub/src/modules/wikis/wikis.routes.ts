import { Router } from 'express';
// Note: Normally you'd import validate from a common lib. Assuming no validate middleware for simplicity or if it exists, it can be added.
import {
    createWiki,
    getWikis,
    getWikiById,
    updateWiki,
    deleteWiki
} from './wikis.controller';
import { validateRequest } from '../../lib/validate';
import { createWikiSchema, updateWikiSchema } from './wikis.schema';

const router = Router();

router.post('/', validateRequest(createWikiSchema), createWiki);
router.get('/', getWikis);
router.get('/:id', getWikiById);
router.put('/:id', validateRequest(updateWikiSchema), updateWiki);
router.delete('/:id', deleteWiki);

export default router;
