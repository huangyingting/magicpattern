'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('powlowskijoshuah@gmail.com');
  const [password, setPassword] = useState('MagicPatterns2026!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError('Invalid email or password, or account is disabled.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-900 text-white font-extrabold text-sm"
          >
            MP
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">Sign in to Magic Patterns</h1>
          <p className="text-xs text-slate-500">
            Invite-only AI design, prototyping, and MagicOS workspace
          </p>
        </div>

        {error && (
          <div
            data-testid="login-error-banner"
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email
            </label>
            <input
              data-testid="login-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              data-testid="login-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-indigo-500"
              placeholder="••••••••••••"
            />
          </div>

          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{loading ? 'Signing in...' : 'Sign in with Email'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Quick Switcher */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Quick Fill Workspace Accounts
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('powlowskijoshuah@gmail.com');
                setPassword('MagicPatterns2026!');
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            >
              Joshuah (Admin)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('alex@magicpatterns.com');
                setPassword('MagicPatterns2026!');
              }}
              className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            >
              Alex (Editor)
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Have a single-use invitation code?{' '}
          <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
            Redeem Invitation
          </Link>
        </div>
      </div>
    </div>
  );
}
