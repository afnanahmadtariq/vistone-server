import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { channelMemberSchema, updateChannelMemberSchema } from "./channel-members.schema";
import { createChannelMemberHandler, getAllChannelMembersHandler, getChannelMemberByIdHandler, updateChannelMemberHandler, deleteChannelMemberHandler } from "./channel-members.controller";

const router = Router();
router.post('/', validateRequest(channelMemberSchema), createChannelMemberHandler);
router.get('/', getAllChannelMembersHandler);
router.get('/:id', getChannelMemberByIdHandler);
router.put('/:id', validateRequest(updateChannelMemberSchema), updateChannelMemberHandler);
router.delete('/:id', deleteChannelMemberHandler);
export default router;
