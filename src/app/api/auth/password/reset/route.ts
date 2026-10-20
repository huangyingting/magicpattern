import { NextResponse } from 'next/server';
import { AccountAdmissionError, resetPassword } from '@/lib/account-admission';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = checkRateLimit(`reset-pwd:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'rate_limited', error: 'Too many password reset attempts.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const password = String(body.password || '');

    if (!token || !password) {
      return NextResponse.json(
        { ok: false, error: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    const result = await resetPassword({ token, password });
    return NextResponse.json({
      ok: true,
      userId: result.userId,
      email: result.email,
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Could not reset password.' },
      { status: 500 }
    );
  }
}
