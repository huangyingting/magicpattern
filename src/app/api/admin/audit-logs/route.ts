import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role !== 'Admin') {
      await recordAuditLog({
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'rbac.denied',
        targetType: 'audit_logs',
        metadata: { role: actor.role },
      });
      return NextResponse.json(
        { ok: false, error: 'Only Admins can inspect security audit logs.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get('action') || '';
    const search = (searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

    const logs = await prisma.auditLog.findMany({
      where: actionFilter ? { action: actionFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const filtered = search
      ? logs.filter(
          (l) =>
            l.action.toLowerCase().includes(search) ||
            (l.actorEmail || '').toLowerCase().includes(search) ||
            (l.targetId || '').toLowerCase().includes(search) ||
            l.metadataJson.toLowerCase().includes(search)
        )
      : logs;

    return NextResponse.json({
      ok: true,
      logs: filtered.map((l) => ({
        id: l.id,
        workspaceId: l.workspaceId,
        actorId: l.actorId,
        actorEmail: l.actorEmail,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        metadata: (() => {
          try {
            return JSON.parse(l.metadataJson);
          } catch {
            return {};
          }
        })(),
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load audit logs.' },
      { status: 500 }
    );
  }
}
