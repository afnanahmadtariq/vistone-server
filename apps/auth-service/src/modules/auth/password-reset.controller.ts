import { Request, Response } from 'express';
import * as crypto from 'crypto';
import prisma from '../../lib/prisma';
import { postNotificationEmail } from '../../lib/notification-email-client';
import { getUserIdFromBearerToken, hashPassword } from './auth.controller';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendPasswordResetEmail(email: string, resetLink: string, name?: string | null) {
  const displayName = name?.trim() || 'there';
  const html = `
    <!DOCTYPE html>
    <html><body style="font-family:Segoe UI,sans-serif;line-height:1.6;color:#334155;">
      <h2>Reset your Vistone password</h2>
      <p>Hi ${displayName},</p>
      <p>We received a request to reset your password. Click the link below — it expires in one hour.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Reset password</a></p>
      <p style="font-size:14px;color:#64748b;">If you did not request this, you can ignore this email.</p>
    </body></html>
  `;
  await postNotificationEmail({
    to: email,
    subject: 'Reset your Vistone password',
    html,
  });
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim() } });
    // Always return success to avoid email enumeration
    if (!user?.password) {
      res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetLink = `${APP_BASE_URL.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    try {
      await sendPasswordResetEmail(user.email, resetLink, name);
    } catch (mailErr) {
      console.error('Password reset email failed:', mailErr);
    }

    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const tokenHash = hashResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset link' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashPassword(password) },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

export async function changePasswordHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) {
      res.status(400).json({ error: 'Password login is not set up for this account' });
      return;
    }

    if (user.password !== hashPassword(currentPassword)) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashPassword(newPassword) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}
