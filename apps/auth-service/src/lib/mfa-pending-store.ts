import * as crypto from 'crypto';

const MFA_PENDING_TTL_MS = 5 * 60 * 1000;

const mfaPendingStore = new Map<string, { userId: string; expiresAt: Date }>();

export function issueMfaPendingToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  mfaPendingStore.set(token, {
    userId,
    expiresAt: new Date(Date.now() + MFA_PENDING_TTL_MS),
  });
  return token;
}

export function peekMfaPendingToken(token: string): string | null {
  const entry = mfaPendingStore.get(token);
  if (!entry || entry.expiresAt < new Date()) {
    if (entry) mfaPendingStore.delete(token);
    return null;
  }
  return entry.userId;
}

/** @deprecated Prefer peek + clearMfaPendingToken on success */
export function consumeMfaPendingToken(token: string): string | null {
  const userId = peekMfaPendingToken(token);
  if (userId) mfaPendingStore.delete(token);
  return userId;
}

export function clearMfaPendingToken(token: string): void {
  mfaPendingStore.delete(token);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] ?? '*' : `${local[0]}***${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

export function createMfaRequiredResponse(userId: string, email?: string | null) {
  return {
    mfaRequired: true,
    mfaToken: issueMfaPendingToken(userId),
    mfaEmailHint: email ? maskEmail(email) : null,
    accessToken: null,
    refreshToken: null,
    user: null,
  };
}
