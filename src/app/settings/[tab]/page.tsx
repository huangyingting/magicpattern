'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import {
  Users,
  CreditCard,
  Building2,
  BarChart3,
  UserCircle,
  Puzzle,
  Plug,
  Sparkles,
  KeyRound,
  Check,
  Copy,
  Plus,
  Download,
  ShieldCheck,
  X,
} from 'lucide-react';

const SETTINGS_TABS = [
  { id: 'team', label: 'Team & Members', icon: Users },
  { id: 'subscription', label: 'Subscription & Credits', icon: CreditCard },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'usage-reports', label: 'Usage Reports', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'connectors', label: 'Connectors (MCP)', icon: Plug },
  { id: 'skills', label: 'Skills (SKILL.md)', icon: Sparkles },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
];

export default function SettingsTabPage() {
  const params = useParams<{ tab: string }>();
  const activeTab = params.tab || 'team';

  const [data, setData] = useState<{
    workspace: {
      id: string;
      name: string;
      logoColor: string;
      planTier: string;
      billingInterval: string;
      shareNewDesignsWithWorkspace: boolean;
      ssoEnabled: boolean;
      ssoProvider: string | null;
      ssoDomain: string | null;
      rolledOverCredits: number;
      monthlyCreditsUsed: number;
      monthlyCreditsQuota: number;
      freeCreditsUsed: number;
      freeCreditsQuota: number;
      giftedCredits: number;
      purchasedCredits: number;
      invoices: Array<{ id: string; date: string; plan: string; amount: string; status: string }>;
    } | null;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      handle: string;
      billingEmail: string;
      role: string;
      streakDays: number;
      tokensUsed: number;
      connectedAccounts: { linkedin?: boolean; github?: boolean; figma?: boolean };
    } | null;
    members: Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      role: string;
      plan: string;
      streakDays: number;
      tokensUsed: number;
      designsCreated: number;
    }>;
    integrationKeys: Array<{
      id: string;
      provider: string;
      name: string;
      tokenPrefix: string;
      status: string;
      createdAt: string;
    }>;
    connectors: Array<{
      id: string;
      provider: string;
      name: string;
      description: string;
      status: string;
      isCustom: boolean;
      serverUrl: string | null;
    }>;
    skills: Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      commandRepo: string | null;
      skillMarkdown: string;
      isFeatured: boolean;
      isEnabled: boolean;
    }>;
    apiKeys: Array<{
      id: string;
      name: string;
      keyPrefix: string;
      status: string;
      createdAt: string;
    }>;
  } | null>(null);

  const [toast, setToast] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  // Modals / Forms state
  const [customConnectorOpen, setCustomConnectorOpen] = useState(false);
  const [connName, setConnName] = useState('');
  const [connUrl, setConnUrl] = useState('');

  const [newSkillOpen, setNewSkillOpen] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillMd, setSkillMd] = useState('');

  const [apiKeyName, setApiKeyName] = useState('Production CI Key');
  const [latestRawApiKey, setLatestRawApiKey] = useState('');
  const [latestIntegrationToken, setLatestIntegrationToken] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const loadSettings = async () => {
    const res = await fetch('/api/settings');
    const json = await res.json();
    if (json.ok) setData(json);
  };

  useEffect(() => {
    loadSettings();
  }, [activeTab]);

  const postSetting = async (payload: Record<string, unknown>, message?: string) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.ok) {
      if (json.rawKey) setLatestRawApiKey(json.rawKey);
      if (json.rawToken) setLatestIntegrationToken(json.rawToken);
      if (message) showToast(message);
      loadSettings();
    }
    return json;
  };

  const handleDownloadUsageCsv = () => {
    if (!data) return;
    const rows = [
      ['Name', 'Email', 'Role', 'Plan', 'Designs Created', 'Tokens Used', 'Streak Days'],
      ...data.members.map((m) => [
        m.name,
        m.email,
        m.role,
        m.plan,
        String(m.designsCreated),
        String(m.tokensUsed),
        String(m.streakDays),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'magicpatterns-usage-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded workspace usage CSV');
  };

  if (!data || !data.workspace || !data.user) {
    return (
      <WorkspaceShell>
        <div className="p-8 text-xs text-slate-500">Loading workspace settings...</div>
      </WorkspaceShell>
    );
  }

  const { workspace, user, members, integrationKeys, connectors, skills, apiKeys } = data;

  return (
    <WorkspaceShell>
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        {toast && (
          <div
            data-testid="settings-toast"
            className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Workspace & Account Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure team members, invite-only permissions, subscription credits, MCP connectors,
            AI skills, and REST API keys.
          </p>
        </div>

        {/* 9 Settings Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
          {SETTINGS_TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={`/settings/${t.id}`}
                data-testid={`settings-tab-${t.id}`}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  active
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>

        {/* TAB 1: TEAM & MEMBERS (/settings/team) */}
        {activeTab === 'team' && (
          <div className="space-y-6" data-testid="settings-panel-team">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Invite Collaborators ({members.length} Active Members)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Send a single-use expiring invitation token or import members from CSV.
                  </p>
                </div>
                <Link
                  href="/admin/invitations"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Open Full Invitation & Audit Console</span>
                </Link>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/invitations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
                  });
                  const d = await res.json();
                  if (d.ok) {
                    setGeneratedInviteLink(d.inviteUrl);
                    setInviteEmail('');
                    showToast(`Created invitation for ${d.invitation.email}`);
                  }
                }}
                className="flex flex-wrap gap-2"
              >
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="flex-1 min-w-[220px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="Editor">Editor</option>
                  <option value="Viewer">Viewer</option>
                  <option value="Admin">Admin</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  Create Invite Link
                </button>
              </form>

              {generatedInviteLink && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                  <span className="font-mono truncate mr-3">{generatedInviteLink}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(generatedInviteLink);
                      showToast('Copied invite link');
                    }}
                    className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-semibold shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Member</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="py-3 pr-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{m.email}</td>
                      <td className="py-3 pr-4">
                        {user.role === 'Admin' ? (
                          <select
                            data-testid={`member-role-select-${m.email}`}
                            value={m.role}
                            onChange={async (e) => {
                              const nextRole = e.target.value;
                              const res = await fetch('/api/admin/users', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: m.userId, role: nextRole }),
                              });
                              if (res.ok) {
                                showToast(`Updated ${m.email} role to ${nextRole}`);
                                loadSettings();
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-indigo-50/60 text-indigo-700 font-semibold text-xs outline-none"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                            {m.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">{m.plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION & CREDITS (/settings/subscription) */}
        {activeTab === 'subscription' && (
          <div className="space-y-6" data-testid="settings-panel-subscription">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Current Plan: <span className="text-indigo-600">{workspace.planTier}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage monthly credit pools, billing interval, and invoices.
                  </p>
                </div>
                <button
                  data-testid="buy-credits-btn"
                  onClick={() =>
                    postSetting(
                      { section: 'subscription', action: 'purchase_credits', amount: 100 },
                      'Added 100 purchased credits'
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                >
                  + Buy 100 Credits
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Free Credits</div>
                  <div className="text-base font-extrabold text-slate-900 mt-1">
                    {workspace.freeCreditsUsed} / {workspace.freeCreditsQuota}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Monthly Quota</div>
                  <div className="text-base font-extrabold text-slate-900 mt-1">
                    {workspace.monthlyCreditsQuota}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Rolled Over</div>
                  <div className="text-base font-extrabold text-slate-900 mt-1">
                    {workspace.rolledOverCredits}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Gifted Bonus</div>
                  <div className="text-base font-extrabold text-emerald-600 mt-1">
                    {workspace.giftedCredits}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-500">Purchased</div>
                  <div className="text-base font-extrabold text-indigo-600 mt-1">
                    {workspace.purchasedCredits}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                {(['FREE', 'HOBBY', 'PRO'] as const).map((tier) => (
                  <div
                    key={tier}
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      workspace.planTier === tier
                        ? 'border-indigo-500 bg-indigo-50/40'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="font-bold text-sm">{tier}</div>
                    <div className="text-slate-500">
                      {tier === 'FREE'
                        ? '$0 / mo • 100 starter credits'
                        : tier === 'HOBBY'
                        ? '$19 / mo • 150 monthly credits'
                        : '$75 / mo • 500 monthly credits + MCP'}
                    </div>
                    <button
                      data-testid={`switch-plan-${tier.toLowerCase()}`}
                      onClick={() =>
                        postSetting(
                          { section: 'subscription', planTier: tier },
                          `Switched workspace plan to ${tier}`
                        )
                      }
                      className="w-full py-2 rounded-xl bg-slate-900 text-white font-semibold"
                    >
                      {workspace.planTier === tier ? 'Current Plan' : `Select ${tier}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORKSPACE (/settings/workspace) */}
        {activeTab === 'workspace' && (
          <div className="space-y-6" data-testid="settings-panel-workspace">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs text-xs">
              <h2 className="text-sm font-bold text-slate-900">Workspace General & Security</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Workspace Name</label>
                  <input
                    data-testid="workspace-name-input"
                    value={workspace.name}
                    onChange={(e) =>
                      setData({
                        ...data,
                        workspace: { ...workspace, name: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Enterprise SAML SSO Domain
                  </label>
                  <input
                    value={workspace.ssoDomain || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        workspace: { ...workspace, ssoDomain: e.target.value },
                      })
                    }
                    placeholder="company.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-semibold text-slate-900">
                    Share new designs with workspace by default
                  </div>
                  <div className="text-slate-500">
                    Automatically grant workspace members access to newly generated designs
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={workspace.shareNewDesignsWithWorkspace}
                  onChange={(e) =>
                    postSetting(
                      {
                        section: 'workspace',
                        shareNewDesignsWithWorkspace: e.target.checked,
                      },
                      'Updated workspace sharing preference'
                    )
                  }
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <button
                data-testid="save-workspace-settings-btn"
                onClick={() =>
                  postSetting(
                    {
                      section: 'workspace',
                      name: workspace.name,
                      ssoDomain: workspace.ssoDomain,
                    },
                    'Saved workspace settings'
                  )
                }
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold"
              >
                Save Workspace Settings
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: USAGE REPORTS (/settings/usage-reports) */}
        {activeTab === 'usage-reports' && (
          <div className="space-y-6" data-testid="settings-panel-usage-reports">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Workspace Usage & Token Telemetry
                  </h2>
                  <p className="text-slate-500">
                    Track designs created, LLM tokens consumed, and active daily streaks per member.
                  </p>
                </div>
                <button
                  data-testid="download-usage-csv-btn"
                  onClick={handleDownloadUsageCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Designs Created</th>
                    <th className="py-2 pr-4">Tokens Used</th>
                    <th className="py-2">Active Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="py-3 pr-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{m.role}</td>
                      <td className="py-3 pr-4 font-semibold">{m.designsCreated}</td>
                      <td className="py-3 pr-4 font-mono">{m.tokensUsed.toLocaleString()}</td>
                      <td className="py-3 text-emerald-600 font-bold">{m.streakDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE (/settings/profile) */}
        {activeTab === 'profile' && (
          <div className="space-y-6" data-testid="settings-panel-profile">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs text-xs">
              <h2 className="text-sm font-bold text-slate-900">Personal Profile & Connected Accounts</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    data-testid="profile-firstname-input"
                    value={user.firstName}
                    onChange={(e) =>
                      setData({ ...data, user: { ...user, firstName: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    value={user.lastName}
                    onChange={(e) =>
                      setData({ ...data, user: { ...user, lastName: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Handle</label>
                  <input
                    value={user.handle}
                    onChange={(e) =>
                      setData({ ...data, user: { ...user, handle: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Email</label>
                  <input
                    value={user.billingEmail}
                    onChange={(e) =>
                      setData({ ...data, user: { ...user, billingEmail: e.target.value } })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <button
                data-testid="save-profile-btn"
                onClick={() =>
                  postSetting(
                    {
                      section: 'profile',
                      firstName: user.firstName,
                      lastName: user.lastName,
                      handle: user.handle,
                      billingEmail: user.billingEmail,
                    },
                    'Updated profile settings'
                  )
                }
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold"
              >
                Save Profile
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: INTEGRATIONS (/settings/integrations) */}
        {activeTab === 'integrations' && (
          <div className="space-y-6" data-testid="settings-panel-integrations">
            {latestIntegrationToken && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                <span>
                  Generated Integration Token: <code className="font-bold">{latestIntegrationToken}</code>
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(latestIntegrationToken);
                    showToast('Copied integration token');
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-semibold"
                >
                  Copy
                </button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {[
                {
                  id: 'figma',
                  title: 'Figma Plugin Token',
                  desc: 'Export generated components directly into editable Figma auto-layout frames.',
                },
                {
                  id: 'github',
                  title: 'GitHub Repository Sync',
                  desc: 'Import design system tokens and open automated Pull Requests.',
                },
                {
                  id: 'devin',
                  title: 'Devin AI Integration',
                  desc: 'Allow Devin autonomous engineering agents to pull UI specs.',
                },
                {
                  id: 'cursor',
                  title: 'Cursor MCP Bridge',
                  desc: 'Connect Cursor IDE to your Magic Patterns workspace via MCP.',
                },
                {
                  id: 'claude',
                  title: 'Claude Code MCP',
                  desc: 'Expose components and PRDs to Anthropic Claude Code CLI.',
                },
                {
                  id: 'codex',
                  title: 'OpenAI Codex MCP',
                  desc: 'Sync live prototypes with Codex engineering workflows.',
                },
              ].map((intg) => (
                <div
                  key={intg.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">{intg.title}</div>
                    <p className="text-slate-500 mt-1 leading-relaxed">{intg.desc}</p>
                  </div>
                  <button
                    data-testid={`generate-integration-${intg.id}`}
                    onClick={() =>
                      postSetting(
                        { section: 'integrations', provider: intg.id, name: intg.title },
                        `Generated ${intg.title}`
                      )
                    }
                    className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    Generate Token / Setup MCP
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: MCP CONNECTORS (/settings/connectors) */}
        {activeTab === 'connectors' && (
          <div className="space-y-6" data-testid="settings-panel-connectors">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Model Context Protocol (MCP) Connectors
                </h2>
                <p className="text-xs text-slate-500">
                  Pull meeting notes, tickets, and boards from your tools directly into MagicOS.
                </p>
              </div>
              <button
                data-testid="add-custom-connector-btn"
                onClick={() => setCustomConnectorOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Connector</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {connectors.map((c) => (
                <div
                  key={c.id}
                  data-testid={`connector-card-${c.name.toLowerCase()}`}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{c.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'CONNECTED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1.5 leading-relaxed">{c.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      postSetting(
                        { section: 'connectors', action: 'toggle', connectorId: c.id },
                        `Updated ${c.name} connector`
                      )
                    }
                    className={`w-full py-2 rounded-xl font-semibold ${
                      c.status === 'CONNECTED'
                        ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {c.status === 'CONNECTED' ? 'Disconnect' : `Connect ${c.name}`}
                  </button>
                </div>
              ))}
            </div>

            {customConnectorOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await postSetting(
                      {
                        section: 'connectors',
                        action: 'create_custom',
                        name: connName,
                        serverUrl: connUrl,
                      },
                      `Added custom MCP connector ${connName}`
                    );
                    setConnName('');
                    setConnUrl('');
                    setCustomConnectorOpen(false);
                  }}
                  className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">Add Custom MCP Connector</h3>
                    <button type="button" onClick={() => setCustomConnectorOpen(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    required
                    value={connName}
                    onChange={(e) => setConnName(e.target.value)}
                    placeholder="Connector Name (e.g. Internal Confluent MCP)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                  <input
                    required
                    value={connUrl}
                    onChange={(e) => setConnUrl(e.target.value)}
                    placeholder="https://mcp.internal.company.com/sse"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
                  >
                    Connect Custom MCP Server
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: AI SKILLS (/settings/skills) */}
        {activeTab === 'skills' && (
          <div className="space-y-6" data-testid="settings-panel-skills">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Workspace AI Skills (SKILL.md)
                </h2>
                <p className="text-xs text-slate-500">
                  Reusable instruction packs for motion physics, WCAG accessibility audits, and
                  coding standards.
                </p>
              </div>
              <button
                data-testid="new-skill-btn"
                onClick={() => setNewSkillOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Skill</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              {skills.map((sk) => (
                <div
                  key={sk.id}
                  data-testid={`skill-card-${sk.slug}`}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{sk.name}</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                      {sk.isFeatured ? 'Featured Skill' : 'Custom Skill'}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{sk.description}</p>
                  {sk.commandRepo && (
                    <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px] flex items-center justify-between">
                      <span className="truncate">{sk.commandRepo}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(sk.commandRepo!);
                          showToast('Copied skill CLI command');
                        }}
                        className="ml-2 text-slate-300 hover:text-white"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {newSkillOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await postSetting(
                      {
                        section: 'skills',
                        name: skillName,
                        description: skillDesc,
                        skillMarkdown: skillMd,
                      },
                      `Created custom skill ${skillName}`
                    );
                    setSkillName('');
                    setSkillDesc('');
                    setSkillMd('');
                    setNewSkillOpen(false);
                  }}
                  className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">Create Custom SKILL.md</h3>
                    <button type="button" onClick={() => setNewSkillOpen(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    data-testid="new-skill-name-input"
                    required
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="Skill Name (e.g. Enterprise FinTech Charts)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                  <input
                    required
                    value={skillDesc}
                    onChange={(e) => setSkillDesc(e.target.value)}
                    placeholder="Short description of when to invoke this skill..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                  <textarea
                    rows={4}
                    value={skillMd}
                    onChange={(e) => setSkillMd(e.target.value)}
                    placeholder="# SKILL.md Instructions..."
                    className="w-full p-3 rounded-xl border border-slate-200 font-mono"
                  />
                  <button
                    data-testid="confirm-create-skill-btn"
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
                  >
                    Save Workspace Skill
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: API KEYS (/settings/api-keys) */}
        {activeTab === 'api-keys' && (
          <div className="space-y-6" data-testid="settings-panel-api-keys">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Magic Patterns REST API Keys
                  </h2>
                  <p className="text-slate-500">
                    Programmatically trigger UI generations and export components from CI/CD.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  data-testid="api-key-name-input"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  placeholder="API Key Name"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200"
                />
                <button
                  data-testid="create-api-key-btn"
                  onClick={() =>
                    postSetting(
                      { section: 'api-keys', name: apiKeyName },
                      'Generated new API key'
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold"
                >
                  + Create API Key
                </button>
              </div>

              {latestRawApiKey && (
                <div
                  data-testid="generated-api-key-banner"
                  className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-amber-900">
                      Copy your secret API key now (shown only once):
                    </div>
                    <code className="font-mono text-amber-800">{latestRawApiKey}</code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(latestRawApiKey);
                      showToast('Copied API key');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-900 text-white font-semibold"
                  >
                    Copy Key
                  </button>
                </div>
              )}

              <table className="w-full text-left pt-2">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Key Prefix</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiKeys.map((k) => (
                    <tr key={k.id}>
                      <td className="py-3 pr-4 font-bold">{k.name}</td>
                      <td className="py-3 pr-4 font-mono text-slate-600">{k.keyPrefix}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            k.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {k.status === 'ACTIVE' && (
                          <button
                            onClick={() =>
                              postSetting(
                                { section: 'api-keys', action: 'revoke', keyId: k.id },
                                'Revoked API key'
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 font-semibold"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
