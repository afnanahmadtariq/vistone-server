import { Router } from 'express';
import { sendEmail, emailTemplates } from '../lib/email';

const router = Router();

// Send organization member invitation email
router.post('/invite/organization', async (req, res) => {
  try {
    const { 
      email, 
      inviterName, 
      organizationName, 
      inviteToken,
      recipientName,
    } = req.body;

    if (!email || !inviterName || !organizationName || !inviteToken) {
      res.status(400).json({ 
        error: 'Missing required fields: email, inviterName, organizationName, inviteToken' 
      });
      return;
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'https://vistone-app.vercel.app'}/invite/accept?token=${inviteToken}`;
    
    const template = emailTemplates.organizationInvite({
      inviterName,
      organizationName,
      inviteLink,
      recipientName,
    });

    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (sent) {
      console.log(`Organization invitation email sent to ${email}`);
      res.json({ success: true, message: 'Invitation email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send invitation email' });
    }
  } catch (error) {
    console.error('Organization invite error:', error);
    res.status(500).json({ error: 'Failed to send invitation email' });
  }
});

// Send client portal invitation email
router.post('/invite/client', async (req, res) => {
  try {
    const { 
      email, 
      inviterName, 
      organizationName, 
      projectName,
      inviteToken,
      recipientName,
    } = req.body;

    if (!email || !inviterName || !organizationName || !inviteToken) {
      res.status(400).json({ 
        error: 'Missing required fields: email, inviterName, organizationName, inviteToken' 
      });
      return;
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'https://vistone-app.vercel.app'}/client/invite?token=${inviteToken}`;
    
    const template = emailTemplates.clientInvite({
      inviterName,
      organizationName,
      projectName,
      inviteLink,
      recipientName,
    });

    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (sent) {
      console.log(`Client portal invitation email sent to ${email}`);
      res.json({ success: true, message: 'Client invitation email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send client invitation email' });
    }
  } catch (error) {
    console.error('Client invite error:', error);
    res.status(500).json({ error: 'Failed to send client invitation email' });
  }
});

// Send team invitation email
router.post('/invite/team', async (req, res) => {
  try {
    const { 
      email, 
      inviterName, 
      teamName,
      organizationName, 
      inviteToken,
      recipientName,
    } = req.body;

    if (!email || !inviterName || !teamName || !organizationName) {
      res.status(400).json({ 
        error: 'Missing required fields: email, inviterName, teamName, organizationName' 
      });
      return;
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'https://vistone-app.vercel.app'}/teams/${inviteToken || ''}`;
    
    const template = emailTemplates.teamInvite({
      inviterName,
      teamName,
      organizationName,
      inviteLink,
      recipientName,
    });

    const sent = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (sent) {
      res.json({ success: true, message: 'Team invitation email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send team invitation email' });
    }
  } catch (error) {
    console.error('Team invite error:', error);
    res.status(500).json({ error: 'Failed to send team invitation email' });
  }
});

// Generic email sending endpoint
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || !html) {
      res.status(400).json({ error: 'Missing required fields: to, subject, html' });
      return;
    }

    const sent = await sendEmail({ to, subject, html, text });

    if (sent) {
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
