import { NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  registerWithInvitation,
  beginPublicRegistration,
} from '@/lib/account-admission';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invitationToken = body.invitationToken ? String(body.invitationToken).trim() : '';

    if (!invitationToken) {
      await beginPublicRegistration({
        email: String(body.email || ''),
        password: String(body.password || ''),
        name: body.name ? String(body.name) : null,
      });
    }

    const result = await registerWithInvitation({
      email: String(body.email || ''),
      name: body.name ? String(body.name) : null,
      password: String(body.password || ''),
      token: invitationToken,
    });

    return NextResponse.json({
      ok: true,
      status: 'active',
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to complete registration.' },
      { status: 500 }
    );
  }
}
