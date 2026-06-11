import { postNotificationEmail } from './notification-email-client';

export async function sendMfaCodeEmail(
  email: string,
  code: string,
  name?: string | null,
): Promise<void> {
  const displayName = name?.trim() || 'there';
  const html = `
    <!DOCTYPE html>
    <html><body style="font-family:Segoe UI,sans-serif;line-height:1.6;color:#334155;">
      <h2>Your Vistone verification code</h2>
      <p>Hi ${displayName},</p>
      <p>Use this code to complete sign-in or security verification:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:24px 0;">${code}</p>
      <p style="font-size:14px;color:#64748b;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </body></html>
  `;
  await postNotificationEmail({
    to: email,
    subject: `${code} is your Vistone verification code`,
    html,
  });
}
