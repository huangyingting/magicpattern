'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Home,
  FolderOpen,
  LayoutTemplate,
  Palette,
  Settings,
  Search,
  Plus,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Gift,
  LogOut,
  Menu,
  X,
  Presentation,
  Workflow,
  Layers,
  Star,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface WorkspaceShellProps {
  children: React.ReactNode;
  onTriggerQuickCreate?: (mode: 'DESIGN' | 'SLIDE_DECK' | 'DESIGN_SYSTEM' | 'MAGICOS') => void;
  openOnboardingInitially?: boolean;
}

export function WorkspaceShell({
  children,
  onTriggerQuickCreate,
  openOnboardingInitially = false,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [freeCreditsModalOpen, setFreeCreditsModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(openOnboardingInitially);
  const [onboardingStep, setOnboardingStep] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<
    Array<{ id: string; name: string; type: string; isFavorite: boolean; updatedAt: string }>
  >([]);
  const [workspaceName, setWorkspaceName] = useState("Joshuah's Workspace");
  const [creditsUsed, setCreditsUsed] = useState(5);
  const [creditsQuota, setCreditsQuota] = useState(100);
  const [copiedRef, setCopiedRef] = useState(false);
  const [claimingCredits, setClaimingCredits] = useState(false);

  const userName = session?.user?.name || 'Joshuah Powlowski';
  const userEmail = session?.user?.email || 'powlowskijoshuah@gmail.com';
  const userRole = (session?.user as { role?: string } | undefined)?.role || 'Admin';

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.projects)) {
          setProjects(d.projects);
        }
      })
      .catch(() => null);

    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.workspace) {
          setWorkspaceName(d.workspace.name || "Joshuah's Workspace");
          setCreditsUsed(d.workspace.freeCreditsUsed ?? 5);
          setCreditsQuota(d.workspace.freeCreditsQuota ?? 100);
        }
      })
      .catch(() => null);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateOption = (mode: 'DESIGN' | 'SLIDE_DECK' | 'DESIGN_SYSTEM' | 'MAGICOS') => {
    setCreateDropdownOpen(false);
    setMobileMenuOpen(false);
    if (mode === 'DESIGN_SYSTEM') {
      router.push('/design-systems?create=true');
      return;
    }
    if (mode === 'MAGICOS') {
      router.push('/os/new');
      return;
    }
    if (onTriggerQuickCreate) {
      onTriggerQuickCreate(mode);
    } else {
      router.push(`/dashboard?mode=${mode}`);
    }
  };

  const handleClaimFreeCredits = async () => {
    setClaimingCredits(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'subscription', action: 'claim_free_credits' }),
      });
      const data = await res.json();
      if (data.ok && data.workspace) {
        setCreditsQuota(data.workspace.freeCreditsQuota);
      }
    } finally {
      setClaimingCredits(false);
    }
  };

  const favoriteProjects = projects.filter((p) => p.isFavorite);
  const filteredSearchProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home, active: pathname === '/dashboard' },
    {
      href: '/dashboard/files',
      label: 'Files',
      icon: FolderOpen,
      active: pathname.startsWith('/dashboard/files'),
    },
    {
      href: '/dashboard/templates',
      label: 'Templates',
      icon: LayoutTemplate,
      active: pathname.startsWith('/dashboard/templates'),
    },
    {
      href: '/design-systems',
      label: 'Design Systems',
      icon: Palette,
      active: pathname.startsWith('/design-systems'),
    },
    {
      href: '/admin/invitations',
      label: 'Invitations & Audit',
      icon: ShieldCheck,
      active: pathname.startsWith('/admin/invitations'),
    },
  ];

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-60 select-none">
      {/* Workspace Header */}
      <div className="p-3 border-b border-slate-100 relative">
        <button
          data-testid="workspace-switcher-btn"
          onClick={() => setWsDropdownOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-md bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {workspaceName.charAt(0).toUpperCase()}
            </span>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 truncate">{workspaceName}</div>
              <div className="text-[10px] text-slate-500">1 member • {userRole}</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {wsDropdownOpen && (
          <div
            data-testid="workspace-switcher-menu"
            className="absolute left-3 right-3 top-14 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
              Switch Workspace
            </div>
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50 font-semibold text-slate-900">
              <span>{workspaceName}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                Active
              </span>
            </div>
            <div className="my-1 border-t border-slate-100" />
            <Link
              href="/settings/workspace"
              onClick={() => setWsDropdownOpen(false)}
              className="block px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Workspace Settings
            </Link>
            <Link
              href="/settings/team"
              onClick={() => setWsDropdownOpen(false)}
              className="block px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Invite members
            </Link>
          </div>
        )}

        {/* + Create & Search bar */}
        <div className="mt-2.5 space-y-1.5 relative">
          <button
            data-testid="sidebar-create-btn"
            onClick={() => setCreateDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>

          {createDropdownOpen && (
            <div
              data-testid="sidebar-create-menu"
              className="absolute left-0 right-0 top-10 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs space-y-0.5"
            >
              <button
                onClick={() => handleCreateOption('DESIGN')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left"
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="font-semibold text-slate-900">Design</div>
                  <div className="text-[10px] text-slate-500">Generate interactive UI & components</div>
                </div>
              </button>
              <button
                onClick={() => handleCreateOption('SLIDE_DECK')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left"
              >
                <Presentation className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="font-semibold text-slate-900">Slide Deck</div>
                  <div className="text-[10px] text-slate-500">Multi-slide executive presentations</div>
                </div>
              </button>
              <button
                onClick={() => handleCreateOption('DESIGN_SYSTEM')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left"
              >
                <Palette className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-900">Design System</div>
                  <div className="text-[10px] text-slate-500">Tokens, themes & shared components</div>
                </div>
              </button>
              <button
                onClick={() => handleCreateOption('MAGICOS')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Workflow className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-semibold text-slate-900">MagicOS</div>
                    <div className="text-[10px] text-slate-500">Infinite AI canvas & MCP handoff</div>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  New
                </span>
              </button>
            </div>
          )}

          <button
            data-testid="sidebar-search-btn"
            onClick={() => setSearchModalOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-xs text-slate-500 transition"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search</span>
            </span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      {/* Main Nav Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                  item.active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/os/bVtYnuouBP1paP91KjgwML"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
              pathname.startsWith('/os')
                ? 'bg-indigo-50 text-indigo-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>MagicOS Canvas</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
              New
            </span>
          </Link>
        </nav>

        {/* Favorites */}
        <div>
          <div className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Favorites
          </div>
          {favoriteProjects.length === 0 ? (
            <p className="px-2.5 text-[11px] text-slate-400">
              Star a project to pin it here.
            </p>
          ) : (
            <div className="space-y-0.5">
              {favoriteProjects.slice(0, 4).map((fav) => (
                <Link
                  key={fav.id}
                  href={`/c/${fav.id}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-900 truncate"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="truncate">{fav.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings & Tour */}
        <div className="space-y-0.5 pt-2 border-t border-slate-100">
          <Link
            href="/settings/team"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition ${
              pathname.startsWith('/settings')
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
          <button
            data-testid="open-magicos-tour-btn"
            onClick={() => {
              setOnboardingStep(1);
              setOnboardingOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Meet MagicOS Tour</span>
          </button>
        </div>
      </div>

      {/* Bottom Credits & Account Footer */}
      <div className="p-3 border-t border-slate-200 space-y-2.5 bg-slate-50/50 relative">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">Free Credits</span>
            <span className="text-slate-500">
              {creditsUsed} / {creditsQuota} used
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full"
              style={{ width: `${Math.min(100, Math.round((creditsUsed / Math.max(creditsQuota, 1)) * 100))}%` }}
            />
          </div>
          <div className="flex gap-1.5 pt-0.5">
            <Link
              href="/settings/subscription"
              className="flex-1 text-center py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition"
            >
              Upgrade to Pro
            </Link>
            <button
              data-testid="get-free-credits-btn"
              onClick={() => setFreeCreditsModalOpen(true)}
              className="py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-medium flex items-center gap-1"
              title="Get free credits"
            >
              <Gift className="w-3.5 h-3.5 text-indigo-600" />
              <span>Free</span>
            </button>
          </div>
        </div>

        {/* Account Trigger */}
        <button
          data-testid="account-menu-btn"
          onClick={() => setAccountMenuOpen((v) => !v)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 transition text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 truncate">{userName}</div>
              <div className="text-[10px] text-slate-500 truncate">{userEmail}</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {accountMenuOpen && (
          <div
            data-testid="account-menu-popover"
            className="absolute left-3 right-3 bottom-16 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs space-y-0.5"
          >
            <div className="px-2.5 py-1.5 border-b border-slate-100">
              <div className="font-semibold text-slate-900 truncate">{userName}</div>
              <div className="text-[10px] text-slate-500 truncate">{userEmail}</div>
            </div>
            <Link
              href="/settings/profile"
              onClick={() => setAccountMenuOpen(false)}
              className="block px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Profile Settings
            </Link>
            <Link
              href="/pricing"
              onClick={() => setAccountMenuOpen(false)}
              className="block px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Pricing & Plans
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-medium text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Mobile Header (< 768px) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button
            data-testid="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm text-slate-900">Magic Patterns</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600"
          >
            <Search className="w-4 h-4" />
          </button>
          <Link
            href="/os/new"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            MagicOS
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="relative z-10">{SidebarContent}</div>
          <div
            className="flex-1 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0">{SidebarContent}</aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">{children}</main>

      {/* Search (Ctrl+K) Modal */}
      {searchModalOpen && (
        <div
          data-testid="search-modal"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files, templates, design systems, or commands..."
                className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
              />
              <button
                data-testid="close-search-modal"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Recent Designs & Decks
              </div>
              {filteredSearchProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSearchModalOpen(false);
                    router.push(`/c/${p.id}`);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 text-left text-xs"
                >
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {p.type}
                  </span>
                </button>
              ))}
              {filteredSearchProjects.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching projects found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Get Free Credits Modal */}
      {freeCreditsModalOpen && (
        <div
          data-testid="free-credits-modal"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setFreeCreditsModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Get Free Credits</h3>
                  <p className="text-xs text-slate-500">Refer colleagues or claim a workspace bonus</p>
                </div>
              </div>
              <button
                data-testid="close-free-credits-modal"
                onClick={() => setFreeCreditsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Give a friend <strong>25 free credits</strong> and earn <strong>25 free credits</strong>{' '}
              when they join your Magic Patterns workspace.
            </p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
              <input
                readOnly
                value="https://www.magicpatterns.com/r/joshuah-powlowski"
                className="flex-1 bg-transparent text-xs text-slate-600 outline-none px-1"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText('https://www.magicpatterns.com/r/joshuah-powlowski');
                  setCopiedRef(true);
                  setTimeout(() => setCopiedRef(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRef ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Current Quota: {creditsQuota} credits</span>
              <button
                data-testid="claim-bonus-credits-btn"
                disabled={claimingCredits}
                onClick={handleClaimFreeCredits}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {claimingCredits ? 'Adding...' : '+ Claim 25 Bonus Credits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meet MagicOS 3-Step Onboarding Modal */}
      {onboardingOpen && (
        <div
          data-testid="meet-magicos-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            {/* Visual Interactive Diagram Banner */}
            <div className="bg-slate-950 text-white p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Meet MagicOS • Step {onboardingStep} of 3
                </span>
                <button
                  data-testid="skip-magicos-modal"
                  onClick={() => setOnboardingOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Skip
                </button>
              </div>

              {onboardingStep === 1 && (
                <div className="grid grid-cols-3 gap-3 items-center text-xs">
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="font-semibold text-indigo-300">Checkout PRD</div>
                      <div className="text-[10px] text-slate-400">Pasted ⌘V • Cut drop-off 33%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="font-semibold text-emerald-300">acme/web</div>
                      <div className="text-[10px] text-slate-400">main • Connected</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700">
                      <div className="font-semibold">Checkout · Two column</div>
                      <div className="text-[10px] text-indigo-300">Variant A</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-700">
                      <div className="font-semibold">Checkout · Express</div>
                      <div className="text-[10px] text-indigo-300">Variant B</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-emerald-700/60">
                    <div className="font-semibold text-emerald-300">Coding Agents (MCP)</div>
                    <div className="text-[10px] text-slate-300 mt-1">Claude Code • Cursor • Codex</div>
                  </div>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-indigo-300">
                    Step 2: Connect Repositories, Figma & Live Websites
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Drop any PRD document, GitHub repository (`acme/web`), or brand reference image
                    onto the infinite canvas. MagicOS extracts your exact Tailwind tokens and React
                    primitives automatically.
                  </p>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="font-semibold text-emerald-300">
                    Step 3: One-Click Handoff via Model Context Protocol (MCP)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Once your team aligns on a variant, expose the canvas directly to Claude Code,
                    Cursor, or Codex via MCP so engineering ships production code with zero drift.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {onboardingStep === 1 && 'Meet MagicOS — An Infinite Canvas for AI Design'}
                  {onboardingStep === 2 && 'Bring Your Own Context, PRDs & Design Systems'}
                  {onboardingStep === 3 && 'Handoff Directly to Claude Code, Cursor & Codex'}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {onboardingStep === 1 &&
                    'Explore multiple UI directions side-by-side on an infinite spatial canvas powered by your design system.'}
                  {onboardingStep === 2 &&
                    'Connect Notion, Linear, Granola, Figma, and GitHub repositories so every generated screen matches production.'}
                  {onboardingStep === 3 &&
                    'Compare interactive flows, leave spatial comments, and push approved components straight to your codebase.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOnboardingStep(s)}
                      className={`h-2 rounded-full transition-all ${
                        onboardingStep === s ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {onboardingStep > 1 && (
                    <button
                      onClick={() => setOnboardingStep((s) => s - 1)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back
                    </button>
                  )}
                  {onboardingStep < 3 ? (
                    <button
                      data-testid="next-magicos-step"
                      onClick={() => setOnboardingStep((s) => s + 1)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      data-testid="try-magicos-btn"
                      onClick={() => {
                        setOnboardingOpen(false);
                        router.push('/os/bVtYnuouBP1paP91KjgwML');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Try MagicOS →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
