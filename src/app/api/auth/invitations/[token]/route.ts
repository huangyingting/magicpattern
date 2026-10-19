import { NextResponse } from 'next/server';
import { AccountAdmissionError, inspectAccountInvitation } from '@/lib/account-admission';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const view = await inspectAccountInvitation(token);
    if (view.status !== 'pending' || !view.email) {
      return NextResponse.json(
        {
          ok: false,
          code: view.status,
          error: `This invitation is ${view.status}.`,
        },
        { status: 410 }
      );
    }
    return NextResponse.json({
      ok: true,
      invitation: {
        id: view.id,
        email: view.email,
        role: view.role || 'Editor',
        status: 'PENDING',
        expiresAt: view.expiresAt ? view.expiresAt.toISOString() : new Date().toISOString(),
        workspaceName: "Joshuah's Workspace",
        invitedBy: 'Joshuah Powlowski',
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
      { ok: false, error: 'Failed to inspect invitation.' },
      { status: 500 }
    );
  }
}
