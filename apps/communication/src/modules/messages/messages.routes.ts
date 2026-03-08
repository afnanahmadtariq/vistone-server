import { Router } from 'express';
import {
    getMessagesHandler,
    getMessageByIdHandler,
    createMessageHandler,
} from './messages.controller';

const router = Router();

router.get('/', getMessagesHandler);
router.get('/:id', getMessageByIdHandler);
router.post('/', createMessageHandler);

export default router;
