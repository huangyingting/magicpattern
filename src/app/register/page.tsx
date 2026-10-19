'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ShieldAlert, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [invitationToken, setInvitationToken] = useState(initialToken);
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCode('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          password,
          invitationToken: invitationToken.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Registration failed.');
        setCode(data.code || 'REGISTRATION_REJECTED');
        return;
      }

      // Sign in immediately
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      router.push('/dashboard');
    } catch {
      setError('Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Invite-Only Workspace Admission</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Create Your Account</h1>
          <p className="text-xs text-slate-500">
            Registration requires a valid, single-use workspace invitation token.
          </p>
        </div>

        {error && (
          <div
            data-testid="register-error-banner"
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-1"
          >
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{code || 'INVITATION_REQUIRED'}</span>
            </div>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Single-Use Invitation Token
            </label>
            <input
              data-testid="register-token-input"
              type="text"
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
              placeholder="Paste invitation token..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invited Email Address
            </label>
            <input
              data-testid="register-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="designer@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              data-testid="register-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Lee"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password (minimum 8 characters)
            </label>
            <input
              data-testid="register-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>

          <button
            data-testid="register-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Verifying Invitation...' : 'Claim Invitation & Join Workspace'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading registration...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
