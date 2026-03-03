import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { emailsSchema } from "./emails.schema";
import { sendOrganizationMemberInvitationEmailHandler, sendClientPortalInvitationEmailHandler, sendTeamInvitationEmailHandler, genericEmailSendingEndpointHandler } from "./emails.controller";

const router = Router();
router.post('/invite/organization', validateRequest(emailsSchema), sendOrganizationMemberInvitationEmailHandler);
router.post('/invite/client', validateRequest(emailsSchema), sendClientPortalInvitationEmailHandler);
router.post('/invite/team', validateRequest(emailsSchema), sendTeamInvitationEmailHandler);
router.post('/send', validateRequest(emailsSchema), genericEmailSendingEndpointHandler);
export default router;
