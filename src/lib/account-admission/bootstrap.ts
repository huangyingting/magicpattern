import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';
import { hashPassword } from './passwords';
import { isValidAccountEmail, normalizeAccountEmail } from './policy';

/**
 * Provisions or promotes a root Administrator account from the deployment host CLI
 * (`npm run bootstrap:admin -- --email <email> --password-stdin`).
 *
 * Security invariant: Never exposed via an HTTP API endpoint or public web route.
 * Only an operator with shell/deployment access to the host and database can execute this.
 */
export async function bootstrapAdmin(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const email = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid administrator email address.'
    );
  }

  if (!input.password || input.password.length < 8 || input.password.length > 128) {
    throw new AccountAdmissionError(
      400,
      'invalid_password',
      'Administrator password must be between 8 and 128 characters.'
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const displayName = input.name?.trim() || email.split('@')[0] || 'Workspace Admin';
  const [firstName, ...lastParts] = displayName.split(' ');
  const lastName = lastParts.join(' ') || 'Admin';

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
    });

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            firstName: firstName || 'Admin',
            lastName,
            passwordHash,
            role: 'Admin',
            status: 'active',
            emailVerified: existing.emailVerified ?? now,
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: displayName,
            firstName: firstName || 'Admin',
            lastName,
            passwordHash,
            role: 'Admin',
            status: 'active',
            emailVerified: now,
          },
        });

    await tx.passwordCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passwordHash,
        passwordChangedAt: now,
      },
      update: {
        passwordHash,
        passwordChangedAt: now,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
    });

    let workspace = await tx.workspace.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!workspace) {
      workspace = await tx.workspace.create({
        data: {
          name: `${firstName || 'Admin'}'s Workspace`,
          slug: 'default-workspace',
          planTier: 'FREE',
          freeCreditsQuota: 100,
          freeCreditsUsed: 0,
        },
      });
    }

    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'Admin',
        plan: 'Free',
      },
      update: {
        role: 'Admin',
      },
    });

    await tx.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'system.admin.bootstrap',
        targetType: 'user',
        targetId: user.id,
        metadataJson: JSON.stringify({
          source: 'cli',
          created: !existing,
          role: 'Admin',
        }),
      },
    });

    return {
      user,
      created: !existing,
    };
  });
}
