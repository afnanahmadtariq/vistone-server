import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { loginSchema, registerSchema, googleAuthSchema, refreshSchema, acceptInviteSchema } from "./auth.schema";
import { loginHandler, registerHandler, googleOauthHandler, refreshTokenHandler, logoutHandler, acceptInviteHandler, getCurrentUserMeHandler, getInviteDetailsHandler, createInvitationHandler } from "./auth.controller";

const router = Router();
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/register', validateRequest(registerSchema), registerHandler);
router.post('/google', validateRequest(googleAuthSchema), googleOauthHandler);
router.post('/refresh', validateRequest(refreshSchema), refreshTokenHandler);
router.post('/logout', logoutHandler);
router.post('/accept-invite', validateRequest(acceptInviteSchema), acceptInviteHandler);
router.post('/me', getCurrentUserMeHandler);
router.get('/invite-details/:token', getInviteDetailsHandler);
router.post('/invitations', createInvitationHandler);
export default router;
