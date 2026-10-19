'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import {
  Palette,
  Plus,
  GitBranch as Github,
  Terminal,
  PenTool as Figma,
  Globe,
  Sparkles,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';

interface DesignSystemItem {
  id: string;
  name: string;
  description: string;
  sourceType: string;
  sourceUrl: string | null;
  presetKey: string;
  isDefault: boolean;
  radius: string;
  colors: Record<string, string>;
  projectCount: number;
}

function DesignSystemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [systems, setSystems] = useState<DesignSystemItem[]>([]);
  const [wizardOpen, setWizardOpen] = useState(searchParams.get('create') === 'true');
  const [wizardStep, setWizardStep] = useState<'OVERVIEW' | 'STEP1_SOURCES' | 'STEP2_PRESETS'>(
    'OVERVIEW'
  );
  const [sourceType, setSourceType] = useState<'preset' | 'github' | 'cli' | 'figma' | 'website'>(
    'preset'
  );
  const [sourceUrl, setSourceUrl] = useState('');
  const [presetKey, setPresetKey] = useState<'shadcn' | 'modern-b2b' | 'playful-consumer'>('shadcn');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSystems = async () => {
    const res = await fetch('/api/design-systems');
    const data = await res.json();
    if (data.ok) setSystems(data.designSystems);
  };

  useEffect(() => {
    loadSystems();
  }, []);

  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/design-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:
            name.trim() ||
            (presetKey === 'modern-b2b'
              ? 'Modern B2B SaaS'
              : presetKey === 'playful-consumer'
              ? 'Playful Consumer App'
              : 'Custom Shadcn System'),
          description,
          sourceType,
          sourceUrl: sourceUrl || null,
          presetKey,
        }),
      });
      const data = await res.json();
      if (data.ok && data.designSystem) {
        setWizardOpen(false);
        router.push(`/design-systems/${data.designSystem.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <WorkspaceShell>
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <Palette className="w-3.5 h-3.5" />
              <span>Design Systems & Token Synchronization</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Design Systems</h1>
            <p className="text-xs text-slate-500 mt-1">
              Connect your GitHub codebase, Figma library, or live website URL so every AI design
              uses your exact brand tokens.
            </p>
          </div>
          <button
            data-testid="open-create-ds-wizard"
            onClick={() => {
              setWizardStep('OVERVIEW');
              setWizardOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>New Design System</span>
          </button>
        </div>

        {/* Design Systems Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {systems.map((ds) => (
            <Link
              key={ds.id}
              href={`/design-systems/${ds.id}`}
              data-testid={`ds-card-${ds.id}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 transition shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{ds.name}</span>
                  {ds.isDefault && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{ds.description}</p>

                {/* Swatches */}
                <div className="flex items-center gap-1.5 pt-1">
                  {Object.entries(ds.colors || {})
                    .slice(0, 6)
                    .map(([k, hex]) => (
                      <div
                        key={k}
                        className="w-6 h-6 rounded-lg border border-slate-200 shadow-2xs"
                        style={{ backgroundColor: hex }}
                        title={`${k}: ${hex}`}
                      />
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                <span>Source: {ds.sourceType}</span>
                <span>{ds.projectCount} linked projects →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 2-Step Create Design System Wizard Modal */}
        {wizardOpen && (
          <div
            data-testid="create-ds-wizard-modal"
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-900">Create Design System</span>
                </div>
                <button
                  onClick={() => setWizardOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSystem} className="p-6 space-y-6">
                {/* Step Navigation Pills */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setWizardStep('OVERVIEW')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      wizardStep === 'OVERVIEW'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    data-testid="wizard-step1-btn"
                    onClick={() => setWizardStep('STEP1_SOURCES')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      wizardStep === 'STEP1_SOURCES'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Step 1: Connect Sources
                  </button>
                  <button
                    type="button"
                    data-testid="wizard-step2-btn"
                    onClick={() => setWizardStep('STEP2_PRESETS')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      wizardStep === 'STEP2_PRESETS'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Step 2: Presets & Tokens
                  </button>
                </div>

                {wizardStep === 'OVERVIEW' && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setWizardStep('STEP2_PRESETS')}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 text-left space-y-2 transition"
                    >
                      <Sparkles className="w-6 h-6 text-indigo-600" />
                      <div className="text-sm font-bold text-slate-900">Start from a preset</div>
                      <p className="text-xs text-slate-500">
                        Choose from Base Shadcn, Modern B2B SaaS, or Playful Consumer App and
                        customize tokens.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep('STEP1_SOURCES')}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-400 text-left space-y-2 transition"
                    >
                      <Github className="w-6 h-6 text-emerald-600" />
                      <div className="text-sm font-bold text-slate-900">Connect your library</div>
                      <p className="text-xs text-slate-500">
                        Import components and CSS variables from GitHub, Local CLI, Figma, or a live
                        website URL.
                      </p>
                    </button>
                  </div>
                )}

                {wizardStep === 'STEP1_SOURCES' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {[
                        { id: 'github', label: 'GitHub Repo', icon: Github },
                        { id: 'cli', label: 'Local Code CLI', icon: Terminal },
                        { id: 'figma', label: 'Figma Plugin', icon: Figma },
                        { id: 'website', label: 'Website URL', icon: Globe },
                      ].map((src) => {
                        const Icon = src.icon;
                        return (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() =>
                              setSourceType(src.id as 'github' | 'cli' | 'figma' | 'website')
                            }
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-semibold ${
                              sourceType === src.id
                                ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{src.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {sourceType === 'cli' ? (
                      <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-1">
                        <div className="text-[10px] text-slate-400">Run in your project root:</div>
                        <div>npx @magicpatterns/cli sync --workspace joshuahs-workspace</div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {sourceType === 'github'
                            ? 'GitHub Repository URL'
                            : sourceType === 'figma'
                            ? 'Figma File / Token URL'
                            : 'Public Website URL to Extract Brand Tokens'}
                        </label>
                        <input
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                          placeholder="https://github.com/acme/design-system"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                        />
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setWizardStep('STEP2_PRESETS')}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Continue to Step 2</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 'STEP2_PRESETS' && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3 text-xs">
                      {[
                        {
                          key: 'shadcn',
                          title: 'Start from Shadcn',
                          desc: 'Neutral slate + Inter',
                        },
                        {
                          key: 'modern-b2b',
                          title: 'Modern B2B SaaS',
                          desc: 'Indigo + Plus Jakarta Sans',
                        },
                        {
                          key: 'playful-consumer',
                          title: 'Playful Consumer App',
                          desc: 'Vibrant Pink/Violet + DM Sans',
                        },
                      ].map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          data-testid={`preset-option-${p.key}`}
                          onClick={() =>
                            setPresetKey(p.key as 'shadcn' | 'modern-b2b' | 'playful-consumer')
                          }
                          className={`p-3.5 rounded-xl border text-left space-y-1 ${
                            presetKey === p.key
                              ? 'border-indigo-500 bg-indigo-50/60'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-slate-900 flex items-center justify-between">
                            <span>{p.title}</span>
                            {presetKey === p.key && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                          <div className="text-[11px] text-slate-500">{p.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Design System Name
                        </label>
                        <input
                          data-testid="ds-name-input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Acme Enterprise UI"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Description / Guidelines
                        </label>
                        <input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="High-contrast enterprise tokens..."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setWizardOpen(false)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        data-testid="confirm-create-ds-btn"
                        type="submit"
                        disabled={creating}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        {creating ? 'Creating System...' : 'Create Design System'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

export default function DesignSystemsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs">Loading design systems...</div>}>
      <DesignSystemsContent />
    </Suspense>
  );
}
