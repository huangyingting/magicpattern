import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';
import { hashPassword } from './passwords';
import {
  accountAdmissionMode,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountRole,
} from './policy';
import { hashOpaqueToken } from './tokens';

export type RegistrationInput = {
  email: string;
  password: string;
  name?: string | null;
};

export type InvitationRegistrationInput = RegistrationInput & {
  token: string;
};

function normalizedName(name: string | null | undefined, email: string): string {
  const value = name?.trim();
  return value ? value.slice(0, 120) : email.split('@')[0] || 'Magic Patterns Creator';
}

function registrationEmail(email: string): string {
  if (!isValidAccountEmail(email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid email address.'
    );
  }
  return normalizeAccountEmail(email);
}

export async function registerWithInvitation(
  input: InvitationRegistrationInput
) {
  const normalizedEmail = registrationEmail(input.email);

  if (!input.token || !input.token.trim()) {
    await prisma.auditLog.create({
      data: {
        actorEmail: normalizedEmail,
        action: 'account.registration.blocked_missing_invite',
        targetType: 'user',
        metadataJson: JSON.stringify({ email: normalizedEmail }),
      },
    });
    throw new AccountAdmissionError(
      403,
      'invitation_required',
      'An active invitation token is required to register.'
    );
  }

  const tokenHash = hashOpaqueToken(input.token.trim());
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const invitation = await prisma.accountInvitation.findUnique({
    where: { tokenHash },
  });
  if (!invitation || invitation.status !== 'PENDING') {
    await prisma.auditLog.create({
      data: {
        actorEmail: normalizedEmail,
        action: 'account.registration.rejected_invalid_token',
        targetType: 'invitation',
        metadataJson: JSON.stringify({ email: normalizedEmail }),
      },
    });
    throw new AccountAdmissionError(
      410,
      'invalid_invitation',
      'This invitation is invalid, revoked, or has already been used.'
    );
  }

  if (invitation.expiresAt <= now) {
    await prisma.accountInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'EXPIRED',
        activeForEmail: null,
        tokenHash: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        workspaceId: invitation.workspaceId,
        actorEmail: normalizedEmail,
        action: 'account.registration.rejected_expired_token',
        targetType: 'invitation',
        targetId: invitation.id,
        metadataJson: JSON.stringify({ email: normalizedEmail }),
      },
    });
    throw new AccountAdmissionError(
      410,
      'expired',
      'This invitation has expired.'
    );
  }

  if (invitation.normalizedEmail !== normalizedEmail) {
    throw new AccountAdmissionError(
      403,
      'email_mismatch',
      'The invitation does not match this email address.'
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new AccountAdmissionError(
      409,
      'already_member',
      'A Magic Patterns account already exists for this email.'
    );
  }

  const defaultWorkspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  const assignedRole = normalizeAccountRole(invitation.role);
  const fullName = normalizedName(input.name, normalizedEmail);
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || '';

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.accountInvitation.updateMany({
      where: {
        id: invitation.id,
        status: 'PENDING',
        tokenHash,
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        activeForEmail: null,
        tokenHash: null,
      },
    });

    if (claimed.count === 0) {
      throw new AccountAdmissionError(
        410,
        'invalid_invitation',
        'This invitation has already been claimed.'
      );
    }

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        emailVerified: now,
        name: fullName,
        firstName: firstName || fullName,
        lastName,
        role: assignedRole,
        status: 'active',
        passwordHash,
        passwordCredential: {
          create: { passwordHash, passwordChangedAt: now },
        },
      },
    });

    await tx.accountInvitation.update({
      where: { id: invitation.id },
      data: { acceptedById: user.id },
    });

    if (defaultWorkspace) {
      await tx.workspaceMember.create({
        data: {
          workspaceId: defaultWorkspace.id,
          userId: user.id,
          role: assignedRole,
          plan: 'Free',
        },
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: defaultWorkspace?.id || invitation.workspaceId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'account.invitation.accept',
        targetType: 'invitation',
        targetId: invitation.id,
        metadataJson: JSON.stringify({
          userId: user.id,
          email: user.email,
          role: assignedRole,
        }),
      },
    });

    return {
      user,
      workspaceSlug: defaultWorkspace?.slug || 'joshuahs-workspace',
    };
  });
}

export async function beginPublicRegistration(input: RegistrationInput) {
  if (accountAdmissionMode() !== 'public') {
    await prisma.auditLog.create({
      data: {
        actorEmail: input.email || 'anonymous',
        action: 'account.registration.blocked_invite_only',
        targetType: 'user',
        metadataJson: JSON.stringify({ email: input.email }),
      },
    });
    throw new AccountAdmissionError(
      403,
      'invitation_required',
      'An invitation is required to create a Magic Patterns account.'
    );
  }
  throw new AccountAdmissionError(
    403,
    'invitation_required',
    'An invitation is required to create a Magic Patterns account.'
  );
}
