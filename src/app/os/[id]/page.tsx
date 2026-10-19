'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  GitBranch as Github,
  Image as ImageIcon,
  Layers,
  Terminal,
  Plus,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Hand,
  Play,
  ArrowUp,
  MessageSquare,
  ExternalLink,
  Share2,
} from 'lucide-react';

interface CanvasNode {
  id: string;
  type: 'prd' | 'github_repo' | 'image_ref' | 'ui_variant' | 'mcp_agent';
  title: string;
  subtitle: string;
  status?: string;
  x: number;
  y: number;
  projectId?: string;
  content: string;
}

export default function MagicOSCanvasPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canvasId = params.id;

  const [canvas, setCanvas] = useState<{
    id: string;
    name: string;
    zoom: number;
    nodes: CanvasNode[];
    edges: Array<{ from: string; to: string }>;
    transcript: Array<{ id: string; role: string; text: string; createdAt: string }>;
  } | null>(null);

  const [tool, setTool] = useState<'pointer' | 'hand' | 'interact'>('pointer');
  const [zoomPct, setZoomPct] = useState(100);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [synthesizing, setSynthesizing] = useState(false);

  const loadCanvas = async () => {
    const res = await fetch(`/api/canvases/${canvasId}`);
    const data = await res.json();
    if (data.ok && data.canvas) {
      setCanvas(data.canvas);
    }
  };

  useEffect(() => {
    loadCanvas();
  }, [canvasId]);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || !canvas) return;
    setSynthesizing(true);
    try {
      const res = await fetch(`/api/canvases/${canvas.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput }),
      });
      const data = await res.json();
      if (data.ok && data.canvas) {
        setCanvas(data.canvas);
        setPromptInput('');
      }
    } finally {
      setSynthesizing(false);
    }
  };

  const handleAddContextNode = async (type: 'prd' | 'github_repo' | 'image_ref') => {
    if (!canvas) return;
    const newNode: CanvasNode = {
      id: `node_${Date.now()}`,
      type,
      title:
        type === 'prd'
          ? 'Mobile Onboarding Spec'
          : type === 'github_repo'
          ? 'acme/design-tokens'
          : 'competitor-audit.png',
      subtitle: type === 'prd' ? 'Pasted ⌘V' : type === 'github_repo' ? 'Connected' : 'Dropped in',
      x: 80,
      y: 90 + canvas.nodes.filter((n) => n.x < 250).length * 165,
      content: 'Additional context attached to the MagicOS infinite canvas.',
    };
    const nextNodes = [...canvas.nodes, newNode];
    const res = await fetch(`/api/canvases/${canvas.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: nextNodes }),
    });
    const data = await res.json();
    if (data.ok) setCanvas(data.canvas);
  };

  if (!canvas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-xs text-slate-500">
        Loading MagicOS Infinite Canvas...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden select-none">
      {/* Top Floating Canvas Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            data-testid="magicos-home-btn"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
              MagicOS
            </span>
            <input
              value={canvas.name}
              onChange={(e) => setCanvas({ ...canvas, name: e.target.value })}
              onBlur={() =>
                fetch(`/api/canvases/${canvas.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: canvas.name }),
                })
              }
              className="text-sm font-bold text-slate-900 bg-transparent outline-none px-1.5 py-0.5 rounded hover:bg-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            data-testid="magicos-transcript-toggle"
            onClick={() => setTranscriptOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold ${
              transcriptOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{transcriptOpen ? 'Hide transcript' : 'Show transcript'}</span>
          </button>

          <div className="hidden sm:flex items-center border border-slate-200 rounded-xl bg-white px-2 py-1 gap-1.5">
            <button onClick={() => setZoomPct((z) => Math.max(60, z - 10))}>
              <ZoomOut className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <span className="font-mono text-[11px] w-10 text-center">{zoomPct}%</span>
            <button onClick={() => setZoomPct((z) => Math.min(140, z + 10))}>
              <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          <Link
            href="/settings/subscription"
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            Upgrade
          </Link>
        </div>
      </header>

      {/* Main Spatial Canvas Area */}
      <div className="flex-1 flex min-h-0 relative mp-dot-grid overflow-auto">
        {/* Add Context Nodes Bar (Top-Left Floating) */}
        <div className="absolute left-5 top-5 z-20 flex flex-wrap items-center gap-2">
          <button
            data-testid="magicos-add-prd-node"
            onClick={() => handleAddContextNode('prd')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 text-xs font-semibold text-slate-700"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add PRD</span>
          </button>
          <button
            onClick={() => handleAddContextNode('github_repo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-emerald-300 text-xs font-semibold text-slate-700"
          >
            <Github className="w-3.5 h-3.5 text-emerald-600" />
            <span>Connect Repo</span>
          </button>
          <button
            onClick={() => handleAddContextNode('image_ref')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-amber-300 text-xs font-semibold text-slate-700"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
            <span>Add Reference</span>
          </button>
        </div>

        {/* Spatial Graph Surface */}
        <div
          className="relative min-w-[1180px] min-h-[720px] flex-1"
          style={{ transform: `scale(${zoomPct / 100})`, transformOrigin: 'top left' }}
        >
          {/* SVG Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {canvas.edges.map((edge, idx) => {
              const fromNode = canvas.nodes.find((n) => n.id === edge.from);
              const toNode = canvas.nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              const x1 = fromNode.x + 280;
              const y1 = fromNode.y + 60;
              const x2 = toNode.x;
              const y2 = toNode.y + 60;
              return (
                <path
                  key={idx}
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {canvas.nodes.map((node) => (
            <div
              key={node.id}
              data-testid={`canvas-node-${node.id}`}
              style={{ left: node.x, top: node.y }}
              className={`absolute w-[280px] rounded-2xl p-4 shadow-lg border transition ${
                node.type === 'ui_variant'
                  ? 'bg-white border-indigo-300 hover:border-indigo-500'
                  : node.type === 'mcp_agent'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold">
                  {node.type === 'prd' && <FileText className="w-4 h-4 text-indigo-600" />}
                  {node.type === 'github_repo' && <Github className="w-4 h-4 text-emerald-600" />}
                  {node.type === 'image_ref' && <ImageIcon className="w-4 h-4 text-amber-600" />}
                  {node.type === 'ui_variant' && <Layers className="w-4 h-4 text-indigo-600" />}
                  {node.type === 'mcp_agent' && <Terminal className="w-4 h-4 text-emerald-400" />}
                  <span className="truncate">{node.title}</span>
                </div>
                {node.status && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                    {node.status}
                  </span>
                )}
              </div>
              <div
                className={`text-[10px] font-medium mb-2 ${
                  node.type === 'mcp_agent' ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                {node.subtitle}
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  node.type === 'mcp_agent' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {node.content}
              </p>

              {node.type === 'ui_variant' && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-indigo-600">
                    Interactive React + Tailwind
                  </span>
                  <button
                    onClick={() => router.push(`/c/${node.projectId || 'tvajgfewuihg5kqchnvgxv'}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold"
                  >
                    <span>Open Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Collapsible Transcript Drawer */}
        {transcriptOpen && (
          <aside
            data-testid="magicos-transcript-drawer"
            className="w-80 bg-white border-l border-slate-200 p-4 space-y-3 overflow-y-auto z-20 text-xs shrink-0"
          >
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>MagicOS Session Transcript</span>
            </div>
            {canvas.transcript.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl ${
                  item.role === 'user'
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'bg-indigo-50/60 border border-indigo-100 text-slate-700'
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                  {item.role}
                </div>
                <div>{item.text}</div>
              </div>
            ))}
          </aside>
        )}
      </div>

      {/* Bottom Floating Tool Strip & Multimodal Prompt Dock */}
      <div className="p-4 bg-transparent pointer-events-none flex flex-col items-center gap-3 z-30">
        {/* Tool Switcher */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white border border-slate-200 rounded-2xl shadow-lg p-1 text-xs">
          {[
            { id: 'pointer', label: 'Pointer', icon: MousePointer },
            { id: 'hand', label: 'Hand', icon: Hand },
            { id: 'interact', label: 'Interact', icon: Play },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id as 'pointer' | 'hand' | 'interact')}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${
                  tool === t.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Prompt Dock */}
        <form
          onSubmit={handlePromptSubmit}
          className="pointer-events-auto w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-2.5 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-indigo-600 ml-2 shrink-0" />
          <input
            data-testid="magicos-prompt-input"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Describe a new UI variant or flow to synthesize on the canvas..."
            className="flex-1 text-xs text-slate-900 outline-none"
          />
          <button
            data-testid="magicos-prompt-submit"
            type="submit"
            disabled={synthesizing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <span>{synthesizing ? 'Synthesizing...' : 'Generate Variant'}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
