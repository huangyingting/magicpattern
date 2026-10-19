'use client';

import React, { useEffect, useState } from 'react';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import {
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Ban,
  Copy,
  Check,
  FileText,
  Users,
  KeyRound,
  Search,
} from 'lucide-react';

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

interface AuditLogItem {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [ttlHours, setTtlHours] = useState(168);
  const [latestInviteUrl, setLatestInviteUrl] = useState('');
  const [latestRawToken, setLatestRawToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const loadAll = async () => {
    const [invRes, usrRes, audRes] = await Promise.all([
      fetch('/api/admin/invitations').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
      fetch(`/api/admin/audit-logs?q=${encodeURIComponent(auditSearch)}`).then((r) => r.json()),
    ]);
    if (invRes.ok) setInvitations(invRes.invitations);
    if (usrRes.ok) setUsers(usrRes.users);
    if (audRes.ok) setAuditLogs(audRes.logs);
  };

  useEffect(() => {
    loadAll();
  }, [auditSearch]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('');
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, ttlHours }),
    });
    const data = await res.json();
    if (data.ok) {
      setLatestInviteUrl(data.inviteUrl);
      setLatestRawToken(data.rawToken);
      setEmail('');
      setStatusMessage(`Created single-use invitation for ${data.invitation.email}`);
      loadAll();
    } else {
      setStatusMessage(data.error || 'Failed to create invitation');
    }
  };

  const handleRotate = async (id: string) => {
    const res = await fetch(`/api/admin/invitations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttlHours: 168 }),
    });
    const data = await res.json();
    if (data.ok) {
      setLatestInviteUrl(data.inviteUrl);
      setLatestRawToken(data.rawToken);
      setStatusMessage(`Rotated token for ${data.invitation.email}`);
      loadAll();
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) {
      setStatusMessage(`Revoked invitation for ${data.invitation.email}`);
      loadAll();
    }
  };

  const handleUpdateUser = async (userId: string, updates: { role?: string; status?: string }) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updates }),
    });
    const data = await res.json();
    if (data.ok) {
      setStatusMessage(`Updated user ${data.user.email}`);
      loadAll();
    }
  };

  return (
    <WorkspaceShell>
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enterprise Security & Admission Control</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Invitations, RBAC Roles & Audit Trail
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Issue single-use, expiring invitation codes, rotate or revoke tokens, manage workspace
              roles, and inspect immutable security audit logs.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase">CLI Admin Bootstrap</div>
            <div>npm run bootstrap:admin</div>
          </div>
        </div>

        {statusMessage && (
          <div
            data-testid="admin-status-toast"
            className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800"
          >
            {statusMessage}
          </div>
        )}

        {/* Issue New Single-Use Invitation Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>Issue Single-Use Invitation Code</span>
          </div>

          <form onSubmit={handleCreateInvite} className="grid sm:grid-cols-4 gap-3">
            <input
              data-testid="invite-email-field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-indigo-500"
            />
            <select
              data-testid="invite-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as 'Admin' | 'Editor' | 'Viewer')}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
            >
              <option value="Editor">Editor Role</option>
              <option value="Viewer">Viewer Role</option>
              <option value="Admin">Admin Role</option>
            </select>
            <button
              data-testid="create-invitation-btn"
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Generate Invite Token
            </button>
          </form>

          {latestInviteUrl && (
            <div
              data-testid="generated-invite-box"
              className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  Single-Use Invite Link (Shown Only Once)
                </span>
                <span className="text-[11px] font-mono text-indigo-700">
                  Token: {latestRawToken}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  data-testid="generated-invite-url"
                  readOnly
                  value={latestInviteUrl}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-mono text-slate-800"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(latestInviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Invitations Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Active & Historical Invitations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Role</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Expires</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} data-testid={`invite-row-${inv.email}`}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{inv.email}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {inv.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          inv.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700'
                            : inv.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {inv.status !== 'ACCEPTED' && (
                        <>
                          <button
                            data-testid={`rotate-invite-${inv.email}`}
                            onClick={() => handleRotate(inv.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Rotate</span>
                          </button>
                          {inv.status === 'PENDING' && (
                            <button
                              data-testid={`revoke-invite-${inv.email}`}
                              onClick={() => handleRevoke(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-medium"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workspace Members & RBAC Management */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Workspace Users & Role-Based Access Control (RBAC)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Role</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Change Role / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() =>
                          handleUpdateUser(u.id, {
                            status: u.status === 'active' ? 'disabled' : 'active',
                          })
                        }
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        {u.status === 'active' ? 'Disable' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Immutable Audit Log Viewer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Immutable Security & Workspace Audit Trail</span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filter by action or actor..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs" data-testid="audit-log-table">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Timestamp</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Target</th>
                  <th className="py-2">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-indigo-700">{log.action}</td>
                    <td className="py-2.5 pr-4 text-slate-700">{log.actorEmail || 'system/cli'}</td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="py-2.5 text-slate-500 truncate max-w-xs">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
