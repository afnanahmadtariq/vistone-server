import { Request, Response } from 'express';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import * as crypto from 'crypto';
import prisma from '../../lib/prisma';
import {
  peekMfaPendingToken,
  clearMfaPendingToken,
  maskEmail,
} from '../../lib/mfa-pending-store';
import { getUserIdFromBearerToken, issueAuthTokensForUser } from './auth.controller';
import {
  canResendEmailMfaCode,
  clearEmailMfaCode,
  generateEmailMfaCode,
  markEmailSent,
  storeEmailMfaCode,
  verifyEmailMfaCode,
} from '../../lib/mfa-email-codes';
import { sendMfaCodeEmail } from '../../lib/mfa-email-send';

function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateBackupCodes(count = 8): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    plain.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { plain, hashed };
}

function isMfaActive(mfa: {
  enabled: boolean;
  verifiedAt: Date | null;
  secret: string | null;
  emailMfaEnabled: boolean;
}): boolean {
  return Boolean(
    mfa.enabled &&
      mfa.verifiedAt &&
      (mfa.secret || mfa.emailMfaEnabled),
  );
}

async function verifyTotpOrBackup(
  mfa: { secret: string | null; backupCodes: string[] },
  code: string,
): Promise<{ ok: boolean; usedBackupIndex?: number }> {
  const normalized = code.replace(/\s/g, '');
  if (mfa.secret) {
    const totpResult = await verify({
      secret: mfa.secret,
      token: normalized,
      epochTolerance: 30,
    });
    if (totpResult.valid) return { ok: true };
  }
  const codeHash = hashBackupCode(normalized.toUpperCase());
  const idx = mfa.backupCodes.findIndex((h) => h === codeHash);
  if (idx >= 0) return { ok: true, usedBackupIndex: idx };
  return { ok: false };
}

async function sendLoginEmailCode(mfaToken: string, userId: string): Promise<void> {
  const rateKey = `login-send:${userId}`;
  if (!canResendEmailMfaCode(rateKey)) {
    throw new Error('Please wait a minute before requesting another code');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) {
    throw new Error('No email on file for this account');
  }
  const code = generateEmailMfaCode();
  storeEmailMfaCode(mfaToken, code);
  markEmailSent(rateKey);
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  await sendMfaCodeEmail(user.email, code, name);
}

export async function mfaStatusHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const mfa = await prisma.mfaSetting.findUnique({ where: { userId } });
    res.json({
      enabled: mfa ? isMfaActive(mfa) : false,
      verifiedAt: mfa?.verifiedAt ?? null,
      totpEnabled: Boolean(mfa?.secret && mfa.enabled && mfa.verifiedAt),
      emailMfaEnabled: Boolean(mfa?.emailMfaEnabled && mfa.enabled && mfa.verifiedAt),
      emailHint: user?.email ? maskEmail(user.email) : null,
    });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({ error: 'Failed to get MFA status' });
  }
}

export async function mfaSetupHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Vistone',
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await prisma.mfaSetting.upsert({
      where: { userId },
      create: {
        userId,
        enabled: false,
        secret,
        backupCodes: [],
        verifiedAt: null,
        emailMfaEnabled: true,
      },
      update: {
        enabled: false,
        secret,
        backupCodes: [],
        verifiedAt: null,
      },
    });

    res.json({ otpauthUrl, qrCodeDataUrl });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to start MFA setup' });
  }
}

export async function mfaSetupEmailHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      res.status(400).json({ error: 'No email on file for this account' });
      return;
    }

    const rateKey = `setup-send:${userId}`;
    if (!canResendEmailMfaCode(rateKey)) {
      res.status(429).json({ error: 'Please wait a minute before requesting another code' });
      return;
    }

    const setupToken = crypto.randomBytes(24).toString('hex');
    const code = generateEmailMfaCode();
    storeEmailMfaCode(setupToken, code);
    markEmailSent(rateKey);

    await prisma.mfaSetting.upsert({
      where: { userId },
      create: {
        userId,
        enabled: false,
        secret: null,
        backupCodes: [],
        verifiedAt: null,
        emailMfaEnabled: true,
      },
      update: {
        enabled: false,
        secret: null,
        backupCodes: [],
        verifiedAt: null,
        emailMfaEnabled: true,
      },
    });

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    await sendMfaCodeEmail(user.email, code, name);

    res.json({
      success: true,
      setupToken,
      emailHint: maskEmail(user.email),
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('MFA setup email error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
}

export async function mfaVerifySetupHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const mfa = await prisma.mfaSetting.findUnique({ where: { userId } });
    if (!mfa?.secret) {
      res.status(400).json({ error: 'Start MFA setup first' });
      return;
    }

    const normalized = code.replace(/\s/g, '');
    const verifyResult = await verify({
      secret: mfa.secret,
      token: normalized,
      epochTolerance: 30,
    });
    if (!verifyResult.valid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    const { plain, hashed } = generateBackupCodes();
    await prisma.mfaSetting.update({
      where: { userId },
      data: {
        enabled: true,
        verifiedAt: new Date(),
        backupCodes: hashed,
        emailMfaEnabled: true,
      },
    });

    res.json({ success: true, backupCodes: plain });
  } catch (error) {
    console.error('MFA verify setup error:', error);
    res.status(500).json({ error: 'Failed to verify MFA setup' });
  }
}

export async function mfaVerifySetupEmailHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { code, setupToken } = req.body as { code?: string; setupToken?: string };
    if (!code || !setupToken) {
      res.status(400).json({ error: 'Setup token and verification code are required' });
      return;
    }

    if (!verifyEmailMfaCode(setupToken, code)) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }

    const { plain, hashed } = generateBackupCodes();
    await prisma.mfaSetting.update({
      where: { userId },
      data: {
        enabled: true,
        verifiedAt: new Date(),
        secret: null,
        emailMfaEnabled: true,
        backupCodes: hashed,
      },
    });

    res.json({ success: true, backupCodes: plain });
  } catch (error) {
    console.error('MFA verify setup email error:', error);
    res.status(500).json({ error: 'Failed to verify email MFA setup' });
  }
}

export async function mfaSendEmailCodeHandler(req: Request, res: Response) {
  try {
    const { mfaToken } = req.body as { mfaToken?: string };
    if (!mfaToken) {
      res.status(400).json({ error: 'MFA token is required' });
      return;
    }

    const userId = peekMfaPendingToken(mfaToken);
    if (!userId) {
      res.status(401).json({ error: 'MFA session expired. Please sign in again.' });
      return;
    }

    const mfa = await prisma.mfaSetting.findUnique({ where: { userId } });
    if (!mfa || !isMfaActive(mfa) || !mfa.emailMfaEnabled) {
      res.status(400).json({ error: 'Email verification is not enabled for this account' });
      return;
    }

    await sendLoginEmailCode(mfaToken, userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({
      success: true,
      message: 'Verification code sent',
      emailHint: user?.email ? maskEmail(user.email) : null,
    });
  } catch (error) {
    console.error('MFA send email code error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email code';
    res.status(error instanceof Error && message.includes('wait') ? 429 : 500).json({ error: message });
  }
}

export async function mfaVerifyLoginHandler(req: Request, res: Response) {
  try {
    const { mfaToken, code } = req.body as { mfaToken?: string; code?: string };
    if (!mfaToken || !code) {
      res.status(400).json({ error: 'MFA token and code are required' });
      return;
    }

    const userId = peekMfaPendingToken(mfaToken);
    if (!userId) {
      res.status(401).json({ error: 'MFA session expired. Please sign in again.' });
      return;
    }

    const mfa = await prisma.mfaSetting.findUnique({ where: { userId } });
    if (!mfa || !isMfaActive(mfa)) {
      res.status(400).json({ error: 'MFA is not enabled for this account' });
      return;
    }

    let verified = false;
    let usedBackupIndex: number | undefined;

    const totpResult = await verifyTotpOrBackup(mfa, code);
    if (totpResult.ok) {
      verified = true;
      usedBackupIndex = totpResult.usedBackupIndex;
    } else if (mfa.emailMfaEnabled && verifyEmailMfaCode(mfaToken, code)) {
      verified = true;
    }

    if (!verified) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    if (usedBackupIndex !== undefined) {
      const nextCodes = [...mfa.backupCodes];
      nextCodes.splice(usedBackupIndex, 1);
      await prisma.mfaSetting.update({
        where: { userId },
        data: { backupCodes: nextCodes },
      });
    }

    clearMfaPendingToken(mfaToken);
    clearEmailMfaCode(mfaToken);

    const requestedOrgId = req.headers['x-organization-id'] as string | undefined;
    const payload = await issueAuthTokensForUser(userId, requestedOrgId);
    res.json(payload);
  } catch (error) {
    console.error('MFA verify login error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
}

export async function mfaDisableHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { code, disableToken } = req.body as { code?: string; disableToken?: string };
    if (!code) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const mfa = await prisma.mfaSetting.findUnique({ where: { userId } });
    if (!mfa?.enabled) {
      res.status(400).json({ error: 'MFA is not enabled' });
      return;
    }

    let ok = false;
    let usedBackupIndex: number | undefined;

    if (disableToken && verifyEmailMfaCode(disableToken, code)) {
      ok = true;
    } else {
      const totpResult = await verifyTotpOrBackup(mfa, code);
      if (totpResult.ok) {
        ok = true;
        usedBackupIndex = totpResult.usedBackupIndex;
      }
    }

    if (!ok) {
      res.status(401).json({
        error: disableToken
          ? 'Invalid verification code. Use the latest email code or try your authenticator app.'
          : 'Invalid verification code',
      });
      return;
    }

    if (usedBackupIndex !== undefined) {
      const nextCodes = [...mfa.backupCodes];
      nextCodes.splice(usedBackupIndex, 1);
      await prisma.mfaSetting.update({
        where: { userId },
        data: { backupCodes: nextCodes },
      });
    }

    await prisma.mfaSetting.update({
      where: { userId },
      data: {
        enabled: false,
        secret: null,
        backupCodes: [],
        verifiedAt: null,
        emailMfaEnabled: true,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
}

export async function mfaSendDisableEmailCodeHandler(req: Request, res: Response) {
  try {
    const userId = getUserIdFromBearerToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const mfa = await prisma.mfaSetting.findUnique({ where: { userId } });
    if (!mfa?.enabled) {
      res.status(400).json({ error: 'MFA is not enabled' });
      return;
    }

    const rateKey = `disable-send:${userId}`;
    if (!canResendEmailMfaCode(rateKey)) {
      res.status(429).json({ error: 'Please wait a minute before requesting another code' });
      return;
    }

    const disableToken = crypto.randomBytes(24).toString('hex');
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      res.status(400).json({ error: 'No email on file' });
      return;
    }

    const code = generateEmailMfaCode();
    storeEmailMfaCode(disableToken, code);
    markEmailSent(rateKey);
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    await sendMfaCodeEmail(user.email, code, name);

    res.json({
      success: true,
      disableToken,
      emailHint: maskEmail(user.email),
    });
  } catch (error) {
    console.error('MFA disable email error:', error);
    res.status(500).json({ error: 'Failed to send email code' });
  }
}
