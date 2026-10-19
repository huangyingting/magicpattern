'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { GitFork, Code2, Eye, Sparkles } from 'lucide-react';
import type { ProjectScreen, VirtualFile } from '@/lib/ai-engine';

export default function PublicPreviewPage() {
  const params = useParams<{ shareSlug: string }>();
  const router = useRouter();
  const shareSlug = params.shareSlug;

  const [project, setProject] = useState<{
    id: string;
    shareSlug: string;
    name: string;
    publicPermission: string;
    showWatermark: boolean;
    screens: ProjectScreen[];
    files: Record<string, VirtualFile>;
  } | null>(null);
  const [viewTab, setViewTab] = useState<'preview' | 'code'>('preview');

  useEffect(() => {
    fetch(`/api/projects/${shareSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setProject(d.project);
      });
  }, [shareSlug]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-xs text-slate-500">
        Loading shared preview...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">
              MP
            </span>
            <span>{project.name}</span>
          </Link>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Shared Preview</span>
        </div>

        <div className="flex items-center gap-2">
          {project.publicPermission === 'CODE_AND_FORK' && (
            <>
              <button
                onClick={() => setViewTab(viewTab === 'preview' ? 'code' : 'preview')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 font-semibold flex items-center gap-1.5"
              >
                {viewTab === 'preview' ? <Code2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{viewTab === 'preview' ? 'Inspect Code' : 'Live Preview'}</span>
              </button>
              <button
                onClick={async () => {
                  const res = await fetch(`/api/projects/${project.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fork' }),
                  });
                  const d = await res.json();
                  if (d.ok && d.project) router.push(`/c/${d.project.id}`);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-1.5"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Fork into Workspace</span>
              </button>
            </>
          )}
          <Link
            href={`/c/${project.id}`}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open in Studio</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {viewTab === 'preview' ? (
          <iframe
            title={project.name}
            srcDoc={project.screens[0]?.htmlPreview || ''}
            className="w-full h-full border-0"
          />
        ) : (
          <pre className="w-full h-full overflow-auto p-6 bg-slate-950 text-emerald-300 font-mono text-xs">
            {Object.values(project.files)
              .map((f) => `// === ${f.path} ===\n${f.content}`)
              .join('\n\n')}
          </pre>
        )}
      </main>
    </div>
  );
}
