'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { ArrowLeft, Save, Check, Palette, Code2, Layers } from 'lucide-react';

export default function DesignSystemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [ds, setDs] = useState<{
    id: string;
    name: string;
    description: string;
    radius: string;
    customCss: string;
    isDefault: boolean;
    colors: Record<string, string>;
    typography: Record<string, string>;
    components: Array<{ name: string; variants: string[]; status: string }>;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/design-systems/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDs(d.designSystem);
      });
  }, [id]);

  const handleSave = async () => {
    if (!ds) return;
    const res = await fetch(`/api/design-systems/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ds),
    });
    const data = await res.json();
    if (data.ok) {
      setDs(data.designSystem);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (!ds) {
    return (
      <WorkspaceShell>
        <div className="p-8 text-xs text-slate-500">Loading design system tokens...</div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <div className="max-w-5xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/design-systems"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{ds.name}</h1>
              <p className="text-xs text-slate-500">{ds.description}</p>
            </div>
          </div>
          <button
            data-testid="save-ds-tokens-btn"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved Tokens' : 'Save Changes'}</span>
          </button>
        </div>

        {/* Color Tokens */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Palette className="w-4 h-4 text-indigo-600" />
            <span>Brand Color Palette Tokens</span>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {Object.entries(ds.colors).map(([key, val]) => (
              <div key={key} className="p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold capitalize">
                  <span>{key}</span>
                  <input
                    type="color"
                    value={val}
                    onChange={(e) =>
                      setDs({
                        ...ds,
                        colors: { ...ds.colors, [key]: e.target.value },
                      })
                    }
                    className="w-6 h-6 rounded cursor-pointer border-0"
                  />
                </div>
                <input
                  value={val}
                  onChange={(e) =>
                    setDs({
                      ...ds,
                      colors: { ...ds.colors, [key]: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom CSS Variables & Radius */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Global CSS Variables</span>
            </div>
            <textarea
              rows={6}
              value={ds.customCss}
              onChange={(e) => setDs({ ...ds, customCss: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs outline-none"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Synced Component Primitives</span>
            </div>
            <div className="space-y-2">
              {ds.components.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{c.name}</span>
                    <span className="text-slate-500 ml-2">({c.variants.join(', ')})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
