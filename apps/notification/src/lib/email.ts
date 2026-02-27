import nodemailer from 'nodemailer';

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
  },
});

// Verify transporter connection
transporter.verify((error) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email service ready');
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Vistone" <${process.env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Email Templates
export const emailTemplates = {
  organizationInvite: (data: {
    inviterName: string;
    organizationName: string;
    inviteLink: string;
    recipientName?: string;
  }) => ({
    subject: `You've been invited to join ${data.organizationName} on Vistone`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Organization Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vistone</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                You're Invited! 🎉
              </h2>
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on Vistone - the modern project management platform.
              </p>
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click the button below to accept the invitation and get started:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 15px 0 0; color: #a1a1aa; font-size: 12px;">
                Or copy this link: ${data.inviteLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f4f4f5; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 14px;">
                © ${new Date().getFullYear()} Vistone. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  clientInvite: (data: {
    inviterName: string;
    organizationName: string;
    projectName?: string;
    inviteLink: string;
    recipientName?: string;
  }) => ({
    subject: `${data.organizationName} has invited you to their client portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Client Portal Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vistone</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Client Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Welcome to Your Client Portal 👋
              </h2>
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> from <strong>${data.organizationName}</strong> has invited you to access your personalized client portal on Vistone.
              </p>
              ${data.projectName ? `
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Project: <strong>${data.projectName}</strong>
              </p>
              ` : ''}
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Through this portal, you'll be able to:
              </p>
              <ul style="margin: 0 0 25px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;">
                <li>Track project progress and milestones</li>
                <li>View and approve deliverables</li>
                <li>Communicate with the team</li>
                <li>Access project documents</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Access Client Portal
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                If you didn't expect this invitation, please contact ${data.organizationName} directly.
              </p>
              <p style="margin: 15px 0 0; color: #a1a1aa; font-size: 12px;">
                Or copy this link: ${data.inviteLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f4f4f5; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 14px;">
                © ${new Date().getFullYear()} Vistone. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  teamInvite: (data: {
    inviterName: string;
    teamName: string;
    organizationName: string;
    inviteLink: string;
    recipientName?: string;
  }) => ({
    subject: `You've been added to team "${data.teamName}" on Vistone`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Vistone</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px; font-weight: 600;">
                Welcome to the Team! 🚀
              </h2>
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: #52525b; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has added you to the <strong>${data.teamName}</strong> team at <strong>${data.organizationName}</strong>.
              </p>
              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Click below to view your team and start collaborating:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Team
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f4f4f5; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 14px;">
                © ${new Date().getFullYear()} Vistone. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),
};

export default transporter;
