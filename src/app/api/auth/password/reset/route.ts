import { NextResponse } from 'next/server';
import { AccountAdmissionError, resetPassword } from '@/lib/account-admission';

export async function POST(request: Request) {
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
