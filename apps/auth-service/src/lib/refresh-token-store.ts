import * as crypto from 'crypto';
import prisma from './prisma';

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export async function persistRefreshToken(
  userId: string,
  rawToken: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(rawToken),
      userId,
      expiresAt,
    },
  });
}

/**
 * Validates token, enforces expiry, removes row (rotation / one-time use), returns userId.
 */
export async function consumeValidRefreshToken(
  rawToken: string,
): Promise<{ userId: string } | null> {
  const tokenHash = hashRefreshToken(rawToken);
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!row) {
    return null;
  }
  if (row.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  await prisma.refreshToken.delete({ where: { id: row.id } });
  return { userId: row.userId };
}
