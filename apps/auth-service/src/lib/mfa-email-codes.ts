import * as crypto from 'crypto';

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

type EmailCodeEntry = {
  codeHash: string;
  expiresAt: Date;
  lastSentAt: Date;
};

const emailCodesByKey = new Map<string, EmailCodeEntry>();
const lastSentByKey = new Map<string, Date>();

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateEmailMfaCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function markEmailSent(key: string): void {
  lastSentByKey.set(key, new Date());
}

export function storeEmailMfaCode(key: string, plainCode: string): void {
  emailCodesByKey.set(key, {
    codeHash: hashCode(plainCode.replace(/\s/g, '')),
    expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
    lastSentAt: new Date(),
  });
}

export function canResendEmailMfaCode(key: string): boolean {
  const last = lastSentByKey.get(key);
  if (!last) return true;
  return Date.now() - last.getTime() >= RESEND_COOLDOWN_MS;
}

export function verifyEmailMfaCode(key: string, code: string): boolean {
  const entry = emailCodesByKey.get(key);
  if (!entry || entry.expiresAt < new Date()) {
    emailCodesByKey.delete(key);
    return false;
  }
  const ok = entry.codeHash === hashCode(code.replace(/\s/g, ''));
  if (ok) emailCodesByKey.delete(key);
  return ok;
}

export function clearEmailMfaCode(key: string): void {
  emailCodesByKey.delete(key);
}
