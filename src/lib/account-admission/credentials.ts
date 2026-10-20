import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { AccountAdmissionError } from './errors';
import { createDatabaseSession } from './session';
import { normalizeAccountEmail } from './policy';
import { hashPassword, verifyPassword } from './passwords';
import { createOpaqueToken, hashOpaqueToken } from './tokens';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function authenticatePassword(input: {
  email: string;
  password: string;
}) {
  const normalizedEmail = normalizeAccountEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { passwordCredential: true },
  });

  if (!user || user.status !== 'active') {
    await verifyPassword(input.password || '', DUMMY_PASSWORD_HASH);
    return null;
  }

  const storedHash =
    user.passwordCredential?.passwordHash || user.passwordHash || null;
  if (!storedHash) {
    await verifyPassword(input.password || '', DUMMY_PASSWORD_HASH);
    return null;
  }

  const valid = await verifyPassword(input.password, storedHash);
  if (!valid) {
    return null;
  }

  const session = await createDatabaseSession(user.id);
  return { user, session };
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = normalizeAccountEmail(email);
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { passwordCredential: true },
  });
  if (!user?.email || user.status !== 'active') return null;

  await prisma.passwordCredential.upsert({
    where: { userId: user.id },
    update: {
      resetTokenHash: tokenHash,
      resetExpiresAt: expiresAt,
    },
    create: {
      userId: user.id,
      passwordHash: user.passwordHash || DUMMY_PASSWORD_HASH,
      resetTokenHash: tokenHash,
      resetExpiresAt: expiresAt,
    },
  });

  await recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    action: 'auth.password_reset.requested',
    targetType: 'user',
    targetId: user.id,
    metadata: { expiresAt: expiresAt.toISOString() },
  });

  return { token, email: user.email, expiresAt };
}

export async function resetPassword(input: {
  token: string;
  password: string;
}) {
  const tokenHash = hashOpaqueToken(input.token);
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const credential = await prisma.passwordCredential.findUnique({
    where: { resetTokenHash: tokenHash },
    include: { user: true },
  });

  if (!credential) {
    throw new AccountAdmissionError(
      410,
      'invalid_reset',
      'This password reset link is invalid or no longer active.'
    );
  }

  if (!credential.resetExpiresAt || credential.resetExpiresAt <= now) {
    await prisma.passwordCredential.update({
      where: { id: credential.id },
      data: { resetTokenHash: null, resetExpiresAt: null },
    });
    throw new AccountAdmissionError(
      410,
      'expired',
      'This password reset link has expired.'
    );
  }

  await prisma.$transaction([
    prisma.passwordCredential.update({
      where: { id: credential.id },
      data: {
        passwordHash,
        passwordChangedAt: now,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
    }),
    prisma.user.update({
      where: { id: credential.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.session.deleteMany({ where: { userId: credential.userId } }),
  ]);

  await recordAuditLog({
    actorId: credential.userId,
    actorEmail: credential.user.email,
    action: 'auth.password_reset.completed',
    targetType: 'user',
    targetId: credential.userId,
    metadata: { sessionsRevoked: true },
  });

  return { userId: credential.userId, email: credential.user.email };
}
