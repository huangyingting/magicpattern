'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import {
  Layers,
  Presentation,
  Palette,
  Workflow,
  Sparkles,
  ArrowUp,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  LayoutGrid,
  List,
  Star,
  Plus,
  ChevronDown,
  ExternalLink,
  Copy,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  shareSlug: string;
  name: string;
  prompt: string;
  type: string;
  model: string;
  visibility: string;
  isTemplate: boolean;
  isFavorite: boolean;
  thumbnailAccent: string;
  designSystem?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  updatedAt: string;
  createdAt: string;
}

interface DesignSystemItem {
  id: string;
  name: string;
  presetKey: string;
  isDefault: boolean;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quickMode, setQuickMode] = useState<'NONE' | 'DESIGN' | 'SLIDE_DECK'>(
    searchParams.get('mode') === 'SLIDE_DECK'
      ? 'SLIDE_DECK'
      : searchParams.get('mode') === 'DESIGN' || searchParams.get('prompt')
      ? 'DESIGN'
      : 'NONE'
  );
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [selectedDsId, setSelectedDsId] = useState('ds_shadcn_base');
  const [selectedModel, setSelectedModel] = useState('Auto');
  const [dsPopoverOpen, setDsPopoverOpen] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [inspirationOpen, setInspirationOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Slide Deck outline state
  const [slideDeckTitle, setSlideDeckTitle] = useState('Q4 Product Strategy & Revenue Deck');
  const [outlineText, setOutlineText] = useState(
    '1. Executive Summary & ARR Growth (+115.9% YoY)\n2. MagicOS Infinite Canvas Adoption\n3. Mobile Express Checkout Conversion Lift'
  );

  // Recents filter/sort state
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [canvases, setCanvases] = useState<Array<{ id: string; name: string; updatedAt: string }>>([]);
  const [designSystems, setDesignSystems] = useState<DesignSystemItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'DESIGNS' | 'CANVAS' | 'TEMPLATES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [createdByFilter, setCreatedByFilter] = useState<'all' | 'me'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'name'>('updatedAt');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadData = async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (createdByFilter === 'me') params.set('createdBy', 'me');
    if (visibilityFilter) params.set('visibility', visibilityFilter);
    params.set('sortBy', sortBy);

    const [projRes, dsRes, canvasRes] = await Promise.all([
      fetch(`/api/projects?${params.toString()}`).then((r) => r.json()),
      fetch('/api/design-systems').then((r) => r.json()),
      fetch('/api/canvases').then((r) => r.json()),
    ]);
    if (projRes.ok) setProjects(projRes.projects);
    if (dsRes.ok) {
      setDesignSystems(dsRes.designSystems);
      if (dsRes.designSystems.length > 0 && !selectedDsId) {
        setSelectedDsId(dsRes.designSystems[0].id);
      }
    }
    if (canvasRes.ok) setCanvases(canvasRes.canvases);
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, createdByFilter, visibilityFilter, sortBy]);

  const handleGenerateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const isSlideDeck = quickMode === 'SLIDE_DECK';
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isSlideDeck ? slideDeckTitle : undefined,
          prompt: isSlideDeck
            ? `${slideDeckTitle}\n${outlineText}`
            : prompt || 'Create a clean SaaS analytics metric card with revenue chart and trend badge',
          type: isSlideDeck ? 'SLIDE_DECK' : 'DESIGN',
          model: selectedModel,
          designSystemId: selectedDsId,
        }),
      });
      const data = await res.json();
      if (data.ok && data.project) {
        router.push(`/c/${data.project.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleFavorite = async (project: ProjectItem) => {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: !project.isFavorite }),
    });
    loadData();
  };

  const selectedDsName =
    designSystems.find((d) => d.id === selectedDsId)?.name || 'Base (Shadcn)';

  const displayedProjects = projects.filter((p) => {
    if (activeTab === 'DESIGNS') return p.type === 'DESIGN';
    if (activeTab === 'TEMPLATES') return p.isTemplate;
    if (activeTab === 'CANVAS') return false;
    return true;
  });

  return (
    <WorkspaceShell
      onTriggerQuickCreate={(mode) => {
        if (mode === 'DESIGN' || mode === 'SLIDE_DECK') setQuickMode(mode);
      }}
    >
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
        {/* Top Quick-Create Bar */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              data-testid="quick-create-design"
              onClick={() => setQuickMode(quickMode === 'DESIGN' ? 'NONE' : 'DESIGN')}
              className={`flex items-center justify-between p-4 rounded-2xl border text-left transition ${
                quickMode === 'DESIGN'
                  ? 'bg-indigo-50/70 border-indigo-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Design</div>
                  <div className="text-[11px] text-slate-500">UI & prototypes</div>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-400" />
            </button>

            <button
              data-testid="quick-create-slidedeck"
              onClick={() => setQuickMode(quickMode === 'SLIDE_DECK' ? 'NONE' : 'SLIDE_DECK')}
              className={`flex items-center justify-between p-4 rounded-2xl border text-left transition ${
                quickMode === 'SLIDE_DECK'
                  ? 'bg-purple-50/70 border-purple-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Slide Deck</div>
                  <div className="text-[11px] text-slate-500">Presentations</div>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-400" />
            </button>

            <button
              data-testid="quick-create-design-system"
              onClick={() => router.push('/design-systems?create=true')}
              className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs text-left transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Design System</div>
                  <div className="text-[11px] text-slate-500">Tokens & library</div>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-400" />
            </button>

            <button
              data-testid="quick-create-magicos"
              onClick={() => router.push('/os/new')}
              className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs text-left transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Workflow className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">MagicOS</span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      New
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Infinite AI canvas</div>
                </div>
              </div>
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Inline Design Composer Drawer */}
          {quickMode === 'DESIGN' && (
            <form
              data-testid="inline-design-composer"
              onSubmit={handleGenerateProject}
              className="bg-white border border-slate-200 rounded-2xl shadow-md p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  New AI Design Prompt
                </span>
                <button
                  type="button"
                  onClick={() => setQuickMode('NONE')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <textarea
                data-testid="design-prompt-textarea"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe any UI screen, SaaS dashboard, analytics card, or checkout flow..."
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none p-2 rounded-xl bg-slate-50/60 border border-slate-100"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2 relative">
                  {/* Design System Selector */}
                  <button
                    type="button"
                    data-testid="composer-ds-selector"
                    onClick={() => setDsPopoverOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{selectedDsName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {dsPopoverOpen && (
                    <div className="absolute left-0 top-10 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs space-y-0.5">
                      {designSystems.map((ds) => (
                        <button
                          key={ds.id}
                          type="button"
                          onClick={() => {
                            setSelectedDsId(ds.id);
                            setDsPopoverOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg ${
                            selectedDsId === ds.id
                              ? 'bg-indigo-50 text-indigo-700 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {ds.name}
                        </button>
                      ))}
                      <div className="border-t border-slate-100 my-1" />
                      <Link
                        href="/design-systems?create=true"
                        className="block px-2.5 py-1.5 rounded-lg text-indigo-600 font-semibold hover:bg-indigo-50"
                      >
                        + Create Design System
                      </Link>
                    </div>
                  )}

                  {/* Model Selector */}
                  <button
                    type="button"
                    data-testid="composer-model-selector"
                    onClick={() => setModelPopoverOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <span>Model: {selectedModel}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {modelPopoverOpen && (
                    <div className="absolute left-40 top-10 z-30 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs space-y-0.5">
                      {['Auto', 'Claude 3.7 Sonnet', 'GPT-4o', 'Gemini 2.5 Pro'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedModel(m);
                            setModelPopoverOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg ${
                            selectedModel === m
                              ? 'bg-indigo-50 text-indigo-700 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Inspiration Presets */}
                  <button
                    type="button"
                    onClick={() => setInspirationOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Inspiration</span>
                  </button>
                </div>

                <button
                  data-testid="submit-design-prompt-btn"
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <span>{creating ? 'Generating UI...' : 'Generate Design'}</span>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {inspirationOpen && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {[
                    'Create a clean SaaS analytics metric card with revenue chart and trend badge',
                    'Two-column mobile express checkout flow with Apple Pay and promo code drawer',
                    'AI agent workspace with tool call telemetry and dark mode toggle',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setPrompt(sample)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* Inline Slide Deck Composer Drawer */}
          {quickMode === 'SLIDE_DECK' && (
            <form
              data-testid="inline-slidedeck-composer"
              onSubmit={handleGenerateProject}
              className="bg-white border border-purple-200 rounded-2xl shadow-md p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Presentation className="w-4 h-4 text-purple-600" />
                  Create Executive Slide Deck (Outline & Style)
                </span>
                <button
                  type="button"
                  onClick={() => setQuickMode('NONE')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Presentation Title
                  </label>
                  <input
                    value={slideDeckTitle}
                    onChange={(e) => setSlideDeckTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Style & Design System
                  </label>
                  <select
                    value={selectedDsId}
                    onChange={(e) => setSelectedDsId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white outline-none"
                  >
                    {designSystems.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Slide Outline
                </label>
                <textarea
                  rows={3}
                  value={outlineText}
                  onChange={(e) => setOutlineText(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  data-testid="submit-slidedeck-btn"
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  {creating ? 'Building Slides...' : 'Generate Slide Deck →'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Recents Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-fit">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'DESIGNS', label: 'Designs' },
                  { id: 'CANVAS', label: 'Canvas' },
                  { id: 'TEMPLATES', label: 'Templates' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  data-testid={`recents-tab-${tab.id.toLowerCase()}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 relative">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  data-testid="dashboard-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none"
                />
              </div>

              {/* Filters Popover */}
              <button
                data-testid="filters-popover-btn"
                onClick={() => {
                  setFilterOpen((v) => !v);
                  setSortOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>

              {filterOpen && (
                <div
                  data-testid="filters-popover-menu"
                  className="absolute right-24 top-10 z-30 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-xs space-y-3"
                >
                  <div>
                    <div className="font-semibold text-slate-700 mb-1">Created by</div>
                    <select
                      value={createdByFilter}
                      onChange={(e) => setCreatedByFilter(e.target.value as 'all' | 'me')}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="all">Anyone in workspace</option>
                      <option value="me">Created by me</option>
                    </select>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-700 mb-1">Sharing status</div>
                    <select
                      value={visibilityFilter}
                      onChange={(e) => setVisibilityFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">All permissions</option>
                      <option value="WORKSPACE">Workspace</option>
                      <option value="PRIVATE">Private</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Sort Popover */}
              <button
                data-testid="sort-popover-btn"
                onClick={() => {
                  setSortOpen((v) => !v);
                  setFilterOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>
                  {sortBy === 'updatedAt'
                    ? 'Last Modified'
                    : sortBy === 'createdAt'
                    ? 'Date Created'
                    : 'Alphabetical'}
                </span>
              </button>

              {sortOpen && (
                <div
                  data-testid="sort-popover-menu"
                  className="absolute right-10 top-10 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs space-y-0.5"
                >
                  {(
                    [
                      { id: 'updatedAt', label: 'Last Modified' },
                      { id: 'createdAt', label: 'Date Created' },
                      { id: 'name', label: 'Alphabetical' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg ${
                        sortBy === opt.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid / List View Switcher */}
              <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5">
                <button
                  data-testid="view-mode-grid"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  data-testid="view-mode-list"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Tab Content */}
          {(activeTab === 'CANVAS' || activeTab === 'ALL') && canvases.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {canvases.map((c) => (
                <Link
                  key={c.id}
                  href={`/os/${c.id}`}
                  className="group bg-slate-950 text-white border border-slate-800 rounded-2xl p-5 hover:border-indigo-500 transition flex flex-col justify-between h-48"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                      <Workflow className="w-3 h-3" />
                      MagicOS Infinite Canvas
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      PRD + GitHub Repo + 3 Interactive Variants + MCP Handoff
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Projects Grid or List */}
          {activeTab !== 'CANVAS' && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-2'
              }
            >
              {displayedProjects.map((project) => (
                <div
                  key={project.id}
                  data-testid={`project-card-${project.id}`}
                  className={`group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition shadow-2xs ${
                    viewMode === 'list' ? 'flex items-center justify-between p-4' : ''
                  }`}
                >
                  {viewMode === 'grid' && (
                    <Link
                      href={`/c/${project.id}`}
                      className="block h-36 p-4 relative overflow-hidden border-b border-slate-100"
                      style={{
                        background: `linear-gradient(135deg, ${project.thumbnailAccent}14 0%, #F8FAFC 100%)`,
                      }}
                    >
                      <div className="bg-white/95 border border-slate-200/80 rounded-xl p-3 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {project.type === 'SLIDE_DECK' ? 'SLIDE DECK' : 'LIVE COMPONENT'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">+14.2%</span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 truncate">
                          {project.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{project.prompt}</div>
                      </div>
                    </Link>
                  )}

                  <div className={viewMode === 'grid' ? 'p-4 space-y-2' : 'flex-1 flex items-center justify-between'}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/c/${project.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-indigo-600"
                        >
                          {project.name}
                        </Link>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {project.designSystem?.name || 'Base (Shadcn)'} •{' '}
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(project)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                          title="Toggle favorite"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              project.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                            }`}
                          />
                        </button>
                        <Link
                          href={`/p/${project.shareSlug}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                          title="Public preview link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading workspace...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
