import {
  sendOrganizationMemberInvitationEmailHandler,
  sendClientPortalInvitationEmailHandler,
  sendTeamInvitationEmailHandler,
  genericEmailSendingEndpointHandler,
} from './emails.controller';

jest.mock('../../lib/email', () => ({
  sendEmail: jest.fn(),
  emailTemplates: {
    organizationInvite: jest.fn().mockReturnValue({ subject: 'Org Invite', html: '<p>invite</p>' }),
    clientInvite: jest.fn().mockReturnValue({ subject: 'Client Invite', html: '<p>client</p>' }),
    teamInvite: jest.fn().mockReturnValue({ subject: 'Team Invite', html: '<p>team</p>' }),
  },
}));

import { sendEmail, emailTemplates } from '../../lib/email';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe('Emails Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- sendOrganizationMemberInvitationEmailHandler ---
  describe('sendOrganizationMemberInvitationEmailHandler', () => {
    it('returns 400 if required fields missing', async () => {
      const req: any = { body: { email: 'a@b.com' } };
      const res = mockRes();
      await sendOrganizationMemberInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: email, inviterName, organizationName, inviteToken',
      });
    });

    it('sends invitation email successfully', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(true);
      const req: any = {
        body: {
          email: 'a@b.com',
          inviterName: 'Alice',
          organizationName: 'Acme',
          inviteToken: 'tok123',
          recipientName: 'Bob',
        },
      };
      const res = mockRes();
      await sendOrganizationMemberInvitationEmailHandler(req, res);
      expect(emailTemplates.organizationInvite).toHaveBeenCalledWith(expect.objectContaining({
        inviterName: 'Alice',
        organizationName: 'Acme',
        recipientName: 'Bob',
        role: 'Contributor',
      }));
      expect(sendEmail).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Org Invite', html: '<p>invite</p>' });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Invitation email sent successfully' });
    });

    it('returns 500 if sendEmail returns false', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(false);
      const req: any = {
        body: { email: 'a@b.com', inviterName: 'A', organizationName: 'O', inviteToken: 't' },
      };
      const res = mockRes();
      await sendOrganizationMemberInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 500 on exception', async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error('SMTP'));
      const req: any = {
        body: { email: 'a@b.com', inviterName: 'A', organizationName: 'O', inviteToken: 't' },
      };
      const res = mockRes();
      await sendOrganizationMemberInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- sendClientPortalInvitationEmailHandler ---
  describe('sendClientPortalInvitationEmailHandler', () => {
    it('returns 400 if required fields missing', async () => {
      const req: any = { body: { email: 'a@b.com' } };
      const res = mockRes();
      await sendClientPortalInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('sends client invitation email successfully', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(true);
      const req: any = {
        body: {
          email: 'c@d.com',
          inviterName: 'Alice',
          organizationName: 'Acme',
          projectName: 'Proj',
          inviteToken: 'tok',
          recipientName: 'Client',
        },
      };
      const res = mockRes();
      await sendClientPortalInvitationEmailHandler(req, res);
      expect(emailTemplates.clientInvite).toHaveBeenCalledWith(expect.objectContaining({
        inviterName: 'Alice',
        projectName: 'Proj',
      }));
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Client invitation email sent successfully' });
    });

    it('returns 500 if sendEmail returns false', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(false);
      const req: any = {
        body: { email: 'a@b.com', inviterName: 'A', organizationName: 'O', inviteToken: 't' },
      };
      const res = mockRes();
      await sendClientPortalInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- sendTeamInvitationEmailHandler ---
  describe('sendTeamInvitationEmailHandler', () => {
    it('returns 400 if required fields missing', async () => {
      const req: any = { body: { email: 'a@b.com', inviterName: 'A' } };
      const res = mockRes();
      await sendTeamInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: email, inviterName, teamName, organizationName',
      });
    });

    it('sends team invitation email successfully', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(true);
      const req: any = {
        body: {
          email: 't@t.com',
          inviterName: 'A',
          teamName: 'Dev',
          organizationName: 'Acme',
          inviteToken: 'tok',
          recipientName: 'Bob',
        },
      };
      const res = mockRes();
      await sendTeamInvitationEmailHandler(req, res);
      expect(emailTemplates.teamInvite).toHaveBeenCalledWith(expect.objectContaining({
        teamName: 'Dev',
        organizationName: 'Acme',
      }));
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Team invitation email sent successfully' });
    });

    it('returns 500 if sendEmail returns false', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(false);
      const req: any = {
        body: { email: 'a@b.com', inviterName: 'A', teamName: 'T', organizationName: 'O' },
      };
      const res = mockRes();
      await sendTeamInvitationEmailHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // --- genericEmailSendingEndpointHandler ---
  describe('genericEmailSendingEndpointHandler', () => {
    it('returns 400 if required fields missing', async () => {
      const req: any = { body: { to: 'a@b.com', subject: 'Hi' } };
      const res = mockRes();
      await genericEmailSendingEndpointHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: to, subject, html' });
    });

    it('sends generic email successfully', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(true);
      const req: any = { body: { to: 'a@b.com', subject: 'Hi', html: '<p>Hello</p>' } };
      const res = mockRes();
      await genericEmailSendingEndpointHandler(req, res);
      expect(sendEmail).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Hi', html: '<p>Hello</p>', text: undefined });
      expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Email sent successfully' });
    });

    it('returns 500 if sendEmail returns false', async () => {
      (sendEmail as jest.Mock).mockResolvedValue(false);
      const req: any = { body: { to: 'a@b.com', subject: 'Hi', html: '<p>Hello</p>' } };
      const res = mockRes();
      await genericEmailSendingEndpointHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns 500 on exception', async () => {
      (sendEmail as jest.Mock).mockRejectedValue(new Error('fail'));
      const req: any = { body: { to: 'a@b.com', subject: 'Hi', html: '<p>Hello</p>' } };
      const res = mockRes();
      await genericEmailSendingEndpointHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
