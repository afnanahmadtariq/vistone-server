import nodemailer from 'nodemailer';
import { VISTONE_EMAIL, emailGradientHeaderHtml } from './email-brand';

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
    role?: string;
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
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${VISTONE_EMAIL.background};">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: ${VISTONE_EMAIL.card};">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: ${VISTONE_EMAIL.gradient135};">
              ${emailGradientHeaderHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: ${VISTONE_EMAIL.foreground}; font-size: 24px; font-weight: 600;">
                You're Invited! 🎉
              </h2>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> as a <strong>${data.role || 'Member'}</strong> on Vistone - the modern project management platform.
              </p>
              <p style="margin: 0 0 30px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Click the button below to accept the invitation and get started:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: ${VISTONE_EMAIL.gradient135}; color: ${VISTONE_EMAIL.white}; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: ${VISTONE_EMAIL.subtleText}; font-size: 14px; line-height: 1.6;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 15px 0 0; color: ${VISTONE_EMAIL.subtleText}; font-size: 12px;">
                Or copy this link: ${data.inviteLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: ${VISTONE_EMAIL.light}; text-align: center;">
              <p style="margin: 0; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 14px;">
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
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${VISTONE_EMAIL.background};">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: ${VISTONE_EMAIL.card};">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: ${VISTONE_EMAIL.gradient135};">
              ${emailGradientHeaderHtml('Client Portal')}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: ${VISTONE_EMAIL.foreground}; font-size: 24px; font-weight: 600;">
                Welcome to Your Client Portal 👋
              </h2>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> from <strong>${data.organizationName}</strong> has invited you to access your personalized client portal on Vistone.
              </p>
              ${data.projectName ? `
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Project: <strong>${data.projectName}</strong>
              </p>
              ` : ''}
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Through this portal, you'll be able to:
              </p>
              <ul style="margin: 0 0 25px; padding-left: 20px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.8;">
                <li>Track project progress and milestones</li>
                <li>View and approve deliverables</li>
                <li>Communicate with the team</li>
                <li>Access project documents</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: ${VISTONE_EMAIL.gradient135}; color: ${VISTONE_EMAIL.white}; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Access Client Portal
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: ${VISTONE_EMAIL.subtleText}; font-size: 14px; line-height: 1.6;">
                If you didn't expect this invitation, please contact ${data.organizationName} directly.
              </p>
              <p style="margin: 15px 0 0; color: ${VISTONE_EMAIL.subtleText}; font-size: 12px;">
                Or copy this link: ${data.inviteLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: ${VISTONE_EMAIL.light}; text-align: center;">
              <p style="margin: 0; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 14px;">
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
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${VISTONE_EMAIL.background};">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: ${VISTONE_EMAIL.card};">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: ${VISTONE_EMAIL.gradient135};">
              ${emailGradientHeaderHtml()}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: ${VISTONE_EMAIL.foreground}; font-size: 24px; font-weight: 600;">
                Welcome to the Team! 🚀
              </h2>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                <strong>${data.inviterName}</strong> has added you to the <strong>${data.teamName}</strong> team at <strong>${data.organizationName}</strong>.
              </p>
              <p style="margin: 0 0 30px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Click below to view your team and start collaborating:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.inviteLink}" style="display: inline-block; padding: 14px 32px; background: ${VISTONE_EMAIL.gradient135}; color: ${VISTONE_EMAIL.white}; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Team
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: ${VISTONE_EMAIL.light}; text-align: center;">
              <p style="margin: 0; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 14px;">
                © ${new Date().getFullYear()} Vistone. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),
  projectAssignment: (data: {
    recipientName?: string;
    organizerName: string;
    organizationName: string;
    projectName: string;
    projectLink: string;
    role: 'team' | 'client';
  }) => ({
    subject: `You've been added to project "${data.projectName}" on Vistone`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Assignment</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${VISTONE_EMAIL.background};">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: ${VISTONE_EMAIL.card};">
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: ${VISTONE_EMAIL.gradient135};">
              ${emailGradientHeaderHtml('Project Notification')}
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: ${VISTONE_EMAIL.foreground}; font-size: 24px; font-weight: 600;">
                New Project Assignment 📋
              </h2>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Hi${data.recipientName ? ` ${data.recipientName}` : ''},
              </p>
              <p style="margin: 0 0 15px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                <strong>${data.organizerName}</strong> from <strong>${data.organizationName}</strong> has ${data.role === 'client' ? 'assigned you as the client for' : 'added you to'} the project <strong>${data.projectName}</strong>.
              </p>
              <p style="margin: 0 0 30px; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 16px; line-height: 1.6;">
                Click below to view the project:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${data.projectLink}" style="display: inline-block; padding: 14px 32px; background: ${VISTONE_EMAIL.gradient135}; color: ${VISTONE_EMAIL.white}; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      View Project
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; color: ${VISTONE_EMAIL.subtleText}; font-size: 14px; line-height: 1.6;">
                If you have any questions, contact ${data.organizerName} directly.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: ${VISTONE_EMAIL.light}; text-align: center;">
              <p style="margin: 0; color: ${VISTONE_EMAIL.mutedForeground}; font-size: 14px;">
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
