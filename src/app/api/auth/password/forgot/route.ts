import { NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  accountAdmissionSecretLink,
  requestPasswordReset,
} from '@/lib/account-admission';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = checkRateLimit(`forgot-pwd:${getClientIp(request)}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'rate_limited', error: 'Too many password reset requests.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim();
    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const reset = await requestPasswordReset(email);
    const resetUrl = reset
      ? accountAdmissionSecretLink('/reset-password', reset.token, request.url)
      : null;

    return NextResponse.json({
      ok: true,
      message:
        'If an active account matches that email, a single-use password reset link has been issued.',
      resetToken: reset?.token || null,
      resetUrl,
      expiresAt: reset?.expiresAt ? reset.expiresAt.toISOString() : null,
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Could not request password reset.' },
      { status: 500 }
    );
  }
}
