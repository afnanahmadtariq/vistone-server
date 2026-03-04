import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { loginSchema, registerSchema, googleAuthSchema, refreshSchema, acceptInviteSchema } from "./auth.schema";
import { loginHandler, registerHandler, googleOauthHandlesBothLoginAndSignupHandler, refreshTokenHandler, logoutHandler, acceptInviteCompleteRegistrationForInvitedUsersHandler, getCurrentUserMeHandler } from "./auth.controller";

const router = Router();
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/register', validateRequest(registerSchema), registerHandler);
router.post('/google', validateRequest(googleAuthSchema), googleOauthHandlesBothLoginAndSignupHandler);
router.post('/refresh', validateRequest(refreshSchema), refreshTokenHandler);
router.post('/logout', logoutHandler);
router.post('/accept-invite', validateRequest(acceptInviteSchema), acceptInviteCompleteRegistrationForInvitedUsersHandler);
router.post('/me', getCurrentUserMeHandler);
export default router;
