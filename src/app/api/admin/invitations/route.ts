import { NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  createAccountInvitation,
  listAccountInvitations,
} from '@/lib/account-admission';
import { getAuthenticatedActor } from '@/lib/api-auth';

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json(
        { ok: false, error: 'Viewers cannot inspect workspace invitations.' },
        { status: 403 }
      );
    }

    const invitations = await listAccountInvitations();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    return NextResponse.json({
      ok: true,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
        revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
        createdAt: inv.createdAt.toISOString(),
        invitedBy: inv.invitedBy,
        acceptedUser: inv.acceptedBy,
      })),
      baseUrl,
    });
  } catch (error) {
    console.error('List invitations error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load invitations.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role !== 'Admin' && actor.role !== 'Editor') {
      return NextResponse.json(
        { ok: false, error: 'Only Admins and Editors can create invitations.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const requestedRole =
      body.role === 'Admin' && actor.role === 'Admin'
        ? 'Admin'
        : body.role === 'Viewer'
        ? 'Viewer'
        : 'Editor';

    const result = await createAccountInvitation({
      email: String(body.email || ''),
      role: requestedRole,
      invitedById: actor.id,
      actorEmail: actor.email,
      workspaceId: actor.workspaceId,
      expiresInHours: body.ttlHours ? Number(body.ttlHours) : undefined,
    });

    const origin = new URL(request.url).origin;
    const inviteUrl = `${origin}/invite/${result.token}`;

    return NextResponse.json({
      ok: true,
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        role: result.invitation.role,
        status: result.invitation.status,
        expiresAt: result.invitation.expiresAt.toISOString(),
        createdAt: result.invitation.createdAt.toISOString(),
      },
      rawToken: result.token,
      inviteUrl,
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create invitation.' },
      { status: 500 }
    );
  }
}
