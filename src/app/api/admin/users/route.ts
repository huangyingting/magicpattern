import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json(
        { ok: false, error: 'Viewers cannot list administrative user records.' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        memberships: true,
      },
    });

    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        role: u.role,
        status: u.status,
        streakDays: u.streakDays,
        tokensUsed: u.tokensUsed,
        createdAt: u.createdAt.toISOString(),
        plan: u.memberships[0]?.plan || 'Free',
      })),
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load users.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role !== 'Admin') {
      return NextResponse.json(
        { ok: false, error: 'Only Admins can update user roles or status.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetUserId = String(body.userId || '');
    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'userId is required.' }, { status: 400 });
    }

    const updateData: { role?: string; status?: string } = {};
    if (body.role && ['Admin', 'Editor', 'Viewer'].includes(body.role)) {
      updateData.role = body.role;
    }
    if (body.status && ['active', 'disabled'].includes(body.status)) {
      if (targetUserId === actor.id && body.status === 'disabled') {
        return NextResponse.json(
          { ok: false, error: 'You cannot disable your own active admin account.' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    if (updateData.role) {
      await prisma.workspaceMember.updateMany({
        where: { userId: targetUserId },
        data: { role: updateData.role },
      });
    }

    await recordAuditLog({
      workspaceId: actor.workspaceId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'account.user.update',
      targetType: 'user',
      targetId: updated.id,
      metadata: {
        email: updated.email,
        role: updated.role,
        status: updated.status,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update user.' }, { status: 500 });
  }
}
