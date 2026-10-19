import { Prisma, type AccountInvitation } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';
import {
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountRole,
  type AccountRole,
} from './policy';
import { createOpaqueToken, hashOpaqueToken } from './tokens';

const DEFAULT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateAccountInvitationInput = {
  email: string;
  role?: string | null;
  invitedById?: string;
  actorEmail?: string;
  workspaceId?: string;
  expiresAt?: Date;
  expiresInHours?: number;
};

export type AccountInvitationGrant = {
  invitation: AccountInvitation;
  token: string;
  delivery: { queued: boolean; reason?: string };
};

export type PublicInvitationView = {
  id: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired' | 'invalid';
  maskedEmail: string | null;
  email?: string;
  role?: AccountRole;
  expiresAt: Date | null;
};

function invitationExpiry(
  now: Date,
  requested?: Date,
  expiresInHours?: number
): Date {
  if (expiresInHours && Number.isFinite(expiresInHours) && expiresInHours > 0) {
    return new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  }
  const expiresAt =
    requested ?? new Date(now.getTime() + DEFAULT_INVITATION_TTL_MS);
  if (expiresAt.getTime() <= now.getTime()) {
    throw new AccountAdmissionError(
      400,
      'invalid_expiry',
      'Invitation expiry must be in the future.'
    );
  }
  return expiresAt;
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export async function expirePendingInvitations(now = new Date()): Promise<number> {
  const result = await prisma.accountInvitation.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
      activeForEmail: null,
      tokenHash: null,
    },
  });
  return result.count;
}

export async function createAccountInvitation(
  input: CreateAccountInvitationInput
): Promise<AccountInvitationGrant> {
  const normalizedEmail = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid email address.'
    );
  }

  const role = normalizeAccountRole(input.role);
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();
  const expiresAt = invitationExpiry(now, input.expiresAt, input.expiresInHours);

  try {
    await prisma.accountInvitation.updateMany({
      where: {
        activeForEmail: normalizedEmail,
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
        activeForEmail: null,
        tokenHash: null,
      },
    });

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new AccountAdmissionError(
        409,
        'already_member',
        'A Magic Patterns account already exists for this email.'
      );
    }

    const active = await prisma.accountInvitation.findUnique({
      where: { activeForEmail: normalizedEmail },
      select: { id: true },
    });
    if (active) {
      throw new AccountAdmissionError(
        409,
        'invitation_exists',
        'An active invitation already exists for this email.'
      );
    }

    let inviterId = input.invitedById;
    let actorEmail = input.actorEmail || 'admin@magicpatterns.com';
    if (!inviterId) {
      const adminUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      inviterId = adminUser?.id;
      if (adminUser?.email && !input.actorEmail) {
        actorEmail = adminUser.email;
      }
    }

    const defaultWs = await prisma.workspace.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    const invitation = await prisma.accountInvitation.create({
      data: {
        email: input.email.trim(),
        normalizedEmail,
        activeForEmail: normalizedEmail,
        tokenHash,
        role,
        workspaceId: input.workspaceId || defaultWs?.id || null,
        invitedById: inviterId || null,
        expiresAt,
      },
    });

    await prisma.accountEmailOutbox.create({
      data: {
        invitationId: invitation.id,
        payload: JSON.stringify({
          type: 'account_invitation',
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        }),
        status: 'pending',
        expiresAt: invitation.expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: invitation.workspaceId,
        actorId: inviterId || null,
        actorEmail,
        action: 'account.invitation.create',
        targetType: 'invitation',
        targetId: invitation.id,
        metadataJson: JSON.stringify({
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        }),
      },
    });

    return {
      invitation,
      token,
      delivery: { queued: true },
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new AccountAdmissionError(
        409,
        'invitation_exists',
        'An active invitation already exists for this email.'
      );
    }
    throw error;
  }
}

export async function inspectAccountInvitation(
  token: string,
  now = new Date()
): Promise<PublicInvitationView> {
  const tokenHash = hashOpaqueToken(token);
  const invitation = await prisma.accountInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    return { id: '', status: 'invalid', maskedEmail: null, expiresAt: null };
  }

  if (invitation.status === 'PENDING' && invitation.expiresAt <= now) {
    await prisma.accountInvitation.updateMany({
      where: { id: invitation.id, status: 'PENDING', tokenHash },
      data: {
        status: 'EXPIRED',
        activeForEmail: null,
        tokenHash: null,
      },
    });
    return {
      id: invitation.id,
      status: 'expired',
      maskedEmail: maskEmail(invitation.email),
      role: normalizeAccountRole(invitation.role),
      expiresAt: invitation.expiresAt,
    };
  }

  return {
    id: invitation.id,
    status: invitation.status.toLowerCase() as PublicInvitationView['status'],
    maskedEmail: maskEmail(invitation.email),
    email: invitation.email,
    role: normalizeAccountRole(invitation.role),
    expiresAt: invitation.expiresAt,
  };
}

export async function revokeAccountInvitation(
  id: string,
  actorEmail = 'admin@magicpatterns.com'
): Promise<AccountInvitation> {
  const now = new Date();
  const invitation = await prisma.accountInvitation.findUnique({
    where: { id },
  });
  if (!invitation) {
    throw new AccountAdmissionError(404, 'not_found', 'Invitation not found.');
  }
  if (invitation.status === 'REVOKED') {
    return invitation;
  }
  if (invitation.status !== 'PENDING') {
    throw new AccountAdmissionError(
      409,
      'invalid_transition',
      'Only a pending invitation can be revoked.'
    );
  }

  const updated = await prisma.accountInvitation.update({
    where: { id },
    data: {
      status: 'REVOKED',
      revokedAt: now,
      activeForEmail: null,
      tokenHash: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: updated.workspaceId,
      actorEmail,
      action: 'account.invitation.revoke',
      targetType: 'invitation',
      targetId: updated.id,
      metadataJson: JSON.stringify({
        email: updated.email,
        revokedAt: now.toISOString(),
      }),
    },
  });

  return updated;
}

export async function rotateAccountInvitation(
  id: string,
  expiresAt?: Date,
  actorEmail = 'admin@magicpatterns.com'
): Promise<AccountInvitationGrant> {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const now = new Date();
  const nextExpiry = invitationExpiry(now, expiresAt);

  const invitation = await prisma.accountInvitation.findUnique({
    where: { id },
  });
  if (!invitation) {
    throw new AccountAdmissionError(404, 'not_found', 'Invitation not found.');
  }
  if (invitation.status !== 'PENDING' || invitation.expiresAt <= now) {
    throw new AccountAdmissionError(
      409,
      'invalid_transition',
      'Only a pending invitation can be rotated.'
    );
  }

  const updated = await prisma.accountInvitation.update({
    where: { id },
    data: { tokenHash, expiresAt: nextExpiry },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: updated.workspaceId,
      actorEmail,
      action: 'account.invitation.rotate',
      targetType: 'invitation',
      targetId: updated.id,
      metadataJson: JSON.stringify({
        email: updated.email,
        expiresAt: nextExpiry.toISOString(),
      }),
    },
  });

  return {
    invitation: updated,
    token,
    delivery: { queued: true },
  };
}

export async function listAccountInvitations() {
  await expirePendingInvitations();
  return prisma.accountInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      createdAt: true,
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
      acceptedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
