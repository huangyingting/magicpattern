import { NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  registerWithInvitation,
  beginPublicRegistration,
  createDatabaseSession,
  setDatabaseSessionCookie,
} from '@/lib/account-admission';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = checkRateLimit(`register:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'rate_limited', error: 'Too many registration attempts. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.retryAfterSeconds),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

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

    const dbSession = await createDatabaseSession(result.user.id);
    const response = NextResponse.json({
      ok: true,
      status: 'active',
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    });
    setDatabaseSessionCookie(response, dbSession);
    return response;
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
