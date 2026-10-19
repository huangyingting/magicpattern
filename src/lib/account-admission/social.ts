import { prisma } from '@/lib/prisma';
import {
  accountAdmissionMode,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountRole,
} from './policy';

export function verifiedProviderEmail(
  provider: string,
  profile: Record<string, unknown> | undefined
): string | null {
  if (!profile) return null;
  if (provider === 'google') {
    const email = typeof profile.email === 'string' ? profile.email : '';
    const verified = profile.email_verified === true;
    return verified && isValidAccountEmail(email) ? normalizeAccountEmail(email) : null;
  }
  return null;
}

export async function authorizeSocialSignIn(params: {
  provider: string;
  providerAccountId: string;
  type?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  profile?: Record<string, unknown>;
  userName?: string | null;
  userImage?: string | null;
}): Promise<true | string> {
  const now = new Date();

  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: params.provider,
        providerAccountId: params.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    if (existingAccount.user.status !== 'active') {
      return '/login?error=AccountDisabled';
    }
    return true;
  }

  const verifiedEmail = verifiedProviderEmail(params.provider, params.profile);
  if (!verifiedEmail) {
    return '/login?error=OAuthEmailUnverified';
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: verifiedEmail },
  });

  if (existingUser) {
    if (existingUser.status !== 'active') {
      return '/login?error=AccountDisabled';
    }
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        type: params.type || 'oauth',
        provider: params.provider,
        providerAccountId: params.providerAccountId,
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
        expires_at: params.expiresAt,
        token_type: params.tokenType,
        scope: params.scope,
        id_token: params.idToken,
        session_state: params.sessionState,
      },
    });
    return true;
  }

  const invitation = await prisma.accountInvitation.findUnique({
    where: { activeForEmail: verifiedEmail },
  });

  if (invitation && invitation.status === 'PENDING' && invitation.expiresAt > now) {
    const displayName =
      params.userName?.trim() ||
      (typeof params.profile?.name === 'string' && params.profile.name.trim()) ||
      verifiedEmail.split('@')[0];
    const assignedRole = normalizeAccountRole(invitation.role);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: verifiedEmail,
          name: displayName,
          image: params.userImage || null,
          role: assignedRole,
          status: 'active',
          emailVerified: now,
        },
      });

      await tx.account.create({
        data: {
          userId: user.id,
          type: params.type || 'oauth',
          provider: params.provider,
          providerAccountId: params.providerAccountId,
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
          expires_at: params.expiresAt,
          token_type: params.tokenType,
          scope: params.scope,
          id_token: params.idToken,
          session_state: params.sessionState,
        },
      });

      await tx.accountInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: {
          status: 'ACCEPTED',
          acceptedById: user.id,
          acceptedAt: now,
          activeForEmail: null,
          tokenHash: null,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: invitation.workspaceId,
          actorId: user.id,
          actorEmail: user.email,
          action: 'account.invitation.accept_oauth',
          targetType: 'invitation',
          targetId: invitation.id,
          metadataJson: JSON.stringify({ provider: params.provider, role: assignedRole }),
        },
      });
    });

    return true;
  }

  if (accountAdmissionMode() === 'invitation-only') {
    return '/login?error=InvitationRequired';
  }

  return true;
}
