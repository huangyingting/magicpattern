'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { LayoutTemplate, GitFork, ExternalLink, Sparkles } from 'lucide-react';

interface TemplateProject {
  id: string;
  shareSlug: string;
  name: string;
  prompt: string;
  type: string;
  forksCount: number;
  viewsCount: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateProject[]>([]);
  const [forkingId, setForkingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects?templates=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTemplates(d.projects);
      });
  }, []);

  const handleFork = async (id: string) => {
    setForkingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fork' }),
      });
      const data = await res.json();
      if (data.ok && data.project) {
        router.push(`/c/${data.project.id}`);
      }
    } finally {
      setForkingId(null);
    }
  };

  return (
    <WorkspaceShell>
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>Workspace & Starter Templates</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Templates</h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish reusable patterns for your team or fork a starter template into the live AI
              Design Studio.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              data-testid={`template-card-${tpl.id}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:border-indigo-300 transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {tpl.type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {tpl.forksCount} forks • {tpl.viewsCount} views
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{tpl.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{tpl.prompt}</p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  data-testid={`fork-template-${tpl.id}`}
                  disabled={forkingId === tpl.id}
                  onClick={() => handleFork(tpl.id)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>{forkingId === tpl.id ? 'Forking...' : 'Use Template'}</span>
                </button>
                <button
                  onClick={() => router.push(`/p/${tpl.shareSlug}`)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Preview template"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceShell>
  );
}
