import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { createOpaqueToken, hashOpaqueToken } from '@/lib/account-admission/tokens';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const [workspace, user, members, integrationKeys, connectors, skills, apiKeys, projectsCount] =
      await Promise.all([
        prisma.workspace.findUnique({ where: { id: actor.workspaceId } }),
        prisma.user.findUnique({ where: { id: actor.id } }),
        prisma.workspaceMember.findMany({
          where: { workspaceId: actor.workspaceId },
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        }),
        prisma.workspaceIntegrationKey.findMany({
          where: { workspaceId: actor.workspaceId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.mcpConnector.findMany({
          where: { workspaceId: actor.workspaceId },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.aiSkill.findMany({
          where: { workspaceId: actor.workspaceId },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.workspaceApiKey.findMany({
          where: { workspaceId: actor.workspaceId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.designProject.count({ where: { workspaceId: actor.workspaceId } }),
      ]);

    return NextResponse.json({
      ok: true,
      workspace: workspace
        ? {
            ...workspace,
            paymentMethod: JSON.parse(workspace.paymentMethodJson || '{}'),
            invoices: JSON.parse(workspace.invoicesJson || '[]'),
          }
        : null,
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName || 'Joshuah',
            lastName: user.lastName || 'Powlowski',
            handle: user.handle || 'joshuah',
            billingEmail: user.billingEmail || user.email,
            role: user.role,
            streakDays: user.streakDays,
            tokensUsed: user.tokensUsed,
            connectedAccounts: JSON.parse(user.connectedAccountsJson || '{}'),
          }
        : null,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name || m.user.email,
        email: m.user.email,
        role: m.role,
        plan: m.plan,
        streakDays: m.user.streakDays,
        tokensUsed: m.user.tokensUsed,
        designsCreated: m.userId === actor.id ? projectsCount : 2,
      })),
      integrationKeys: integrationKeys.map((k) => ({
        id: k.id,
        provider: k.provider,
        name: k.name,
        tokenPrefix: k.maskedKey,
        status: 'ACTIVE',
        createdAt: k.createdAt.toISOString(),
      })),
      connectors,
      skills,
      apiKeys: apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.maskedKey,
        status: 'ACTIVE',
        lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
        createdAt: k.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Load settings error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const section = String(body.section || '');

    if (actor.role === 'Viewer' && section !== 'profile') {
      await recordAuditLog({
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'rbac.denied',
        targetType: 'settings',
        targetId: section,
        metadata: { role: actor.role, section },
      });
      return NextResponse.json(
        { ok: false, error: 'Viewers cannot modify workspace settings.' },
        { status: 403 }
      );
    }

    // 1. Update Workspace Settings (/settings/workspace)
    if (section === 'workspace') {
      const updated = await prisma.workspace.update({
        where: { id: actor.workspaceId },
        data: {
          name: typeof body.name === 'string' ? body.name.trim() : undefined,
          logoColor: typeof body.logoColor === 'string' ? body.logoColor : undefined,
          shareNewDesignsWithWorkspace:
            typeof body.shareNewDesignsWithWorkspace === 'boolean'
              ? body.shareNewDesignsWithWorkspace
              : undefined,
          ssoEnabled: typeof body.ssoEnabled === 'boolean' ? body.ssoEnabled : undefined,
          ssoDomain: typeof body.ssoDomain === 'string' ? body.ssoDomain : undefined,
        },
      });
      await recordAuditLog({
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'settings.workspace.update',
        targetType: 'workspace',
        targetId: updated.id,
        metadata: { name: updated.name, ssoEnabled: updated.ssoEnabled },
      });
      return NextResponse.json({ ok: true, workspace: updated });
    }

    // 2. Update Subscription & Credits (/settings/subscription & Get free credits modal)
    if (section === 'subscription') {
      const ws = await prisma.workspace.findUnique({ where: { id: actor.workspaceId } });
      if (!ws) {
        return NextResponse.json({ ok: false, error: 'Workspace not found.' }, { status: 404 });
      }

      if (body.action === 'claim_free_credits') {
        const updated = await prisma.workspace.update({
          where: { id: actor.workspaceId },
          data: {
            giftedCredits: { increment: 25 },
            freeCreditsQuota: { increment: 25 },
          },
        });
        return NextResponse.json({ ok: true, workspace: updated });
      }

      if (body.action === 'purchase_credits') {
        const amount = Number(body.amount || 100);
        const updated = await prisma.workspace.update({
          where: { id: actor.workspaceId },
          data: {
            purchasedCredits: { increment: amount },
          },
        });
        return NextResponse.json({ ok: true, workspace: updated });
      }

      const planTier = body.planTier ? String(body.planTier) : ws.planTier;
      const billingInterval = body.billingInterval ? String(body.billingInterval) : ws.billingInterval;
      const monthlyQuota =
        planTier === 'PRO' ? 500 : planTier === 'HOBBY' ? 150 : planTier === 'ENTERPRISE' ? 5000 : 0;

      const invoices = JSON.parse(ws.invoicesJson || '[]');
      if (body.planTier && body.planTier !== ws.planTier) {
        invoices.unshift({
          id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().slice(0, 10),
          plan: planTier,
          amount: planTier === 'PRO' ? '$75.00' : planTier === 'HOBBY' ? '$19.00' : '$0.00',
          status: 'Paid',
        });
      }

      const updated = await prisma.workspace.update({
        where: { id: actor.workspaceId },
        data: {
          planTier,
          billingInterval,
          monthlyCreditsQuota: monthlyQuota,
          paymentMethodJson: body.paymentMethod
            ? JSON.stringify(body.paymentMethod)
            : ws.paymentMethodJson,
          invoicesJson: JSON.stringify(invoices),
        },
      });
      return NextResponse.json({ ok: true, workspace: updated });
    }

    // 3. Update Profile (/settings/profile)
    if (section === 'profile') {
      const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
      const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
      const fullName =
        firstName !== undefined || lastName !== undefined
          ? `${firstName ?? ''} ${lastName ?? ''}`.trim()
          : undefined;

      const updated = await prisma.user.update({
        where: { id: actor.id },
        data: {
          firstName,
          lastName,
          name: fullName || undefined,
          handle: typeof body.handle === 'string' ? body.handle.trim() : undefined,
          billingEmail: typeof body.billingEmail === 'string' ? body.billingEmail.trim() : undefined,
          connectedAccountsJson: body.connectedAccounts
            ? JSON.stringify(body.connectedAccounts)
            : undefined,
        },
      });
      return NextResponse.json({ ok: true, user: updated });
    }

    // 4. Generate or Revoke Integration Token (/settings/integrations)
    if (section === 'integrations') {
      if (body.action === 'revoke' && body.keyId) {
        await prisma.workspaceIntegrationKey.delete({
          where: { id: String(body.keyId) },
        });
        return NextResponse.json({ ok: true });
      }

      const provider = String(body.provider || 'figma');
      const rawToken = `mp_${provider}_${createOpaqueToken().slice(0, 24)}`;
      const created = await prisma.workspaceIntegrationKey.create({
        data: {
          workspaceId: actor.workspaceId,
          provider,
          name: String(body.name || `${provider.toUpperCase()} Integration Token`),
          maskedKey: `${rawToken.slice(0, 12)}...`,
          keyHash: hashOpaqueToken(rawToken),
          createdById: actor.id,
        },
      });
      return NextResponse.json({
        ok: true,
        integrationKey: {
          ...created,
          tokenPrefix: created.maskedKey,
          status: 'ACTIVE',
        },
        rawToken,
      });
    }

    // 5. Connect/Disconnect MCP Connector or Add Custom Connector (/settings/connectors)
    if (section === 'connectors') {
      if (body.action === 'toggle' && body.connectorId) {
        const existing = await prisma.mcpConnector.findUnique({
          where: { id: String(body.connectorId) },
        });
        if (existing) {
          const nextStatus = existing.status === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED';
          const updated = await prisma.mcpConnector.update({
            where: { id: existing.id },
            data: { status: nextStatus },
          });
          return NextResponse.json({ ok: true, connector: updated });
        }
      }

      if (body.action === 'create_custom') {
        const created = await prisma.mcpConnector.create({
          data: {
            workspaceId: actor.workspaceId,
            provider: 'Custom',
            name: String(body.name || 'Custom MCP Server').trim(),
            description: String(
              body.description || 'Custom Model Context Protocol server endpoint.'
            ).trim(),
            serverUrl: String(body.serverUrl || 'https://mcp.internal.example.com/sse').trim(),
            authType: String(body.authType || 'Bearer Token'),
            status: 'CONNECTED',
            isCustom: true,
          },
        });
        return NextResponse.json({ ok: true, connector: created });
      }
    }

    // 6. Create or Toggle AI Skill (/settings/skills)
    if (section === 'skills') {
      if (body.action === 'toggle' && body.skillId) {
        const existing = await prisma.aiSkill.findUnique({ where: { id: String(body.skillId) } });
        if (existing) {
          const updated = await prisma.aiSkill.update({
            where: { id: existing.id },
            data: { isEnabled: !existing.isEnabled },
          });
          return NextResponse.json({ ok: true, skill: updated });
        }
      }

      if (body.action === 'delete' && body.skillId) {
        await prisma.aiSkill.delete({ where: { id: String(body.skillId) } });
        return NextResponse.json({ ok: true });
      }

      const name = String(body.name || 'Custom UI Skill').trim();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const created = await prisma.aiSkill.create({
        data: {
          workspaceId: actor.workspaceId,
          slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
          name,
          description: String(body.description || 'Custom workspace SKILL.md instruction set.'),
          commandRepo: body.commandRepo
            ? String(body.commandRepo)
            : `npx skills add magicpatterns/skills --skill ${slug}`,
          skillMarkdown: String(
            body.skillMarkdown || `# ${name}\n\nAlways follow our component accessibility and layout guidelines.`
          ),
          isFeatured: false,
          isEnabled: true,
        },
      });
      return NextResponse.json({ ok: true, skill: created });
    }

    // 7. Create or Revoke REST API Key (/settings/api-keys)
    if (section === 'api-keys') {
      if (body.action === 'revoke' && body.keyId) {
        await prisma.workspaceApiKey.delete({
          where: { id: String(body.keyId) },
        });
        return NextResponse.json({ ok: true });
      }

      const rawKey = `mp_live_${createOpaqueToken().slice(0, 28)}`;
      const created = await prisma.workspaceApiKey.create({
        data: {
          workspaceId: actor.workspaceId,
          name: String(body.name || 'Production API Key').trim(),
          maskedKey: `${rawKey.slice(0, 14)}...`,
          keyHash: hashOpaqueToken(rawKey),
          createdById: actor.id,
        },
      });

      await recordAuditLog({
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'settings.apikey.create',
        targetType: 'api_key',
        targetId: created.id,
        metadata: { name: created.name },
      });

      return NextResponse.json({
        ok: true,
        apiKey: {
          ...created,
          keyPrefix: created.maskedKey,
          status: 'ACTIVE',
        },
        rawKey,
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown settings section.' }, { status: 400 });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update settings.' }, { status: 500 });
  }
}
