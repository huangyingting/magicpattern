'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('powlowskijoshuah@gmail.com');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Unable to generate reset link.');
      } else {
        setSubmitted(true);
        setResetUrl(data.resetUrl || null);
      }
    } catch {
      setError('Network error while requesting password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reset your password</h1>
          <p className="text-xs text-slate-500">
            Enter your account email to receive a single-use cryptographic reset link (1-hour TTL).
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {submitted ? (
          <div
            data-testid="forgot-password-confirmation"
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 text-xs text-emerald-900"
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Single-use reset token issued</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              If an active account matches <strong>{email}</strong>, a password reset link is ready.
            </p>
            {resetUrl && (
              <div className="pt-2 border-t border-emerald-200/70 space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-700">
                  Direct Reset Link:
                </div>
                <Link
                  href={resetUrl}
                  data-testid="forgot-password-reset-link"
                  className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 hover:underline break-all"
                >
                  <span>{resetUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Workspace Email
              </label>
              <input
                data-testid="forgot-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <button
              data-testid="forgot-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              {submitting ? 'Generating Reset Link...' : 'Send Single-Use Reset Link'}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
