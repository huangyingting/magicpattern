import { NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  revokeAccountInvitation,
  rotateAccountInvitation,
} from '@/lib/account-admission';
import { getAuthenticatedActor } from '@/lib/api-auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role !== 'Admin' && actor.role !== 'Editor') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const { invitationId } = await context.params;
    const result = await rotateAccountInvitation(invitationId, undefined, actor.email);

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
    return NextResponse.json(
      { ok: false, error: 'Failed to rotate invitation.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role !== 'Admin' && actor.role !== 'Editor') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const { invitationId } = await context.params;
    const updated = await revokeAccountInvitation(invitationId, actor.email);

    return NextResponse.json({
      ok: true,
      invitation: {
        id: updated.id,
        email: updated.email,
        status: updated.status,
        revokedAt: updated.revokedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to revoke invitation.' },
      { status: 500 }
    );
  }
}
