import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { loginSchema, registerSchema, googleAuthSchema, refreshSchema, acceptInviteSchema } from "./auth.schema";
import { loginHandler, registerHandler, googleOauthHandler, refreshTokenHandler, logoutHandler, acceptInviteHandler, getCurrentUserMeHandler, getInviteDetailsHandler, createInvitationHandler } from "./auth.controller";
import {
  mfaSetupHandler,
  mfaSetupEmailHandler,
  mfaVerifySetupHandler,
  mfaVerifySetupEmailHandler,
  mfaVerifyLoginHandler,
  mfaDisableHandler,
  mfaStatusHandler,
  mfaSendEmailCodeHandler,
  mfaSendDisableEmailCodeHandler,
} from "./mfa.controller";
import {
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
} from "./password-reset.controller";

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
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/change-password', changePasswordHandler);
router.get('/mfa/status', mfaStatusHandler);
router.post('/mfa/setup', mfaSetupHandler);
router.post('/mfa/setup-email', mfaSetupEmailHandler);
router.post('/mfa/verify-setup', mfaVerifySetupHandler);
router.post('/mfa/verify-setup-email', mfaVerifySetupEmailHandler);
router.post('/mfa/send-email-code', mfaSendEmailCodeHandler);
router.post('/mfa/send-disable-email-code', mfaSendDisableEmailCodeHandler);
router.post('/mfa/verify-login', mfaVerifyLoginHandler);
router.post('/mfa/disable', mfaDisableHandler);
export default router;
