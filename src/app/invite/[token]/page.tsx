'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ShieldCheck, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function InviteRedemptionPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<{
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
    workspaceName: string;
    invitedBy: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/invitations/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.invitation) {
          setInvitation(d.invitation);
        } else {
          setError(d.error || 'Invitation is invalid, expired, or has already been redeemed.');
        }
      })
      .catch(() => setError('Failed to verify invitation token.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          name,
          password,
          invitationToken: token,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to accept invitation.');
        return;
      }

      await signIn('credentials', {
        email: invitation.email,
        password,
        redirect: false,
      });
      router.push('/dashboard');
    } catch {
      setError('Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 space-y-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Validating cryptographic invitation token...
          </div>
        ) : !invitation ? (
          <div data-testid="invite-invalid-state" className="text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Invitation Unavailable</h1>
            <p className="text-xs text-slate-600">{error}</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Single-Use Invitation</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Join {invitation.workspaceName}
              </h1>
              <p className="text-xs text-slate-500">
                Invited by <strong>{invitation.invitedBy}</strong> as{' '}
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                  {invitation.role}
                </span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invited Email:</span>
                <span className="font-semibold text-slate-900">{invitation.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-semibold text-indigo-600">{invitation.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Expires:</span>
                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <input
                  data-testid="invite-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password (min 8 chars)
                </label>
                <input
                  data-testid="invite-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <button
                data-testid="accept-invitation-btn"
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Activating Account...' : 'Accept Invitation & Continue'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
