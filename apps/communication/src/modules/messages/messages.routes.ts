import { Router } from 'express';
import {
    getMessagesHandler,
    getMessageByIdHandler,
    createMessageHandler,
    getChannelMediaHandler,
} from './messages.controller';

const router = Router();

router.get('/media', getChannelMediaHandler);  // Must be before /:id
router.get('/', getMessagesHandler);
router.get('/:id', getMessageByIdHandler);
router.post('/', createMessageHandler);

export default router;
