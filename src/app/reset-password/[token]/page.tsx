'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not reset password.');
      } else {
        setDone(true);
        setTimeout(() => router.push('/login'), 1200);
      }
    } catch {
      setError('Network error while resetting password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Choose a new password</h1>
          <p className="text-xs text-slate-500">
            Setting a new password immediately revokes any previous sessions.
          </p>
        </div>

        {error && (
          <div
            data-testid="reset-error-banner"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"
          >
            {error}
          </div>
        )}

        {done ? (
          <div
            data-testid="reset-success-banner"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Password updated! Redirecting to Sign in...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password (min 10 characters)
              </label>
              <input
                data-testid="reset-password-input"
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <button
              data-testid="reset-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              {submitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <Link href="/login" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
            Cancel and return to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
