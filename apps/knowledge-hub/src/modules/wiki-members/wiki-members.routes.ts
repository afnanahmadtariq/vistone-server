import { Router } from 'express';
import {
  createWikiMemberHandler,
  deleteWikiMemberHandler,
  getWikiMemberByIdHandler,
  getWikiMembersHandler,
} from './wiki-members.controller';

const router = Router();

router.post('/', createWikiMemberHandler);
router.get('/', getWikiMembersHandler);
router.get('/:id', getWikiMemberByIdHandler);
router.delete('/:id', deleteWikiMemberHandler);

export default router;
