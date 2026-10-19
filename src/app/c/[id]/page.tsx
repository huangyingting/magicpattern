'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  MousePointerClick,
  MessageSquare,
  LayoutGrid,
  Code2,
  Download,
  Share2,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Sparkles,
  ArrowUp,
  Check,
  Copy,
  X,
  FileCode,
  History,
  GitFork,
  Plus,
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer,
  Play,
  Terminal,
  GitBranch as Github,
  PenTool as Figma,
  MoreHorizontal,
} from 'lucide-react';
import type {
  ChatMessage,
  ProjectScreen,
  ProjectVersion,
  SpatialComment,
  VirtualFile,
} from '@/lib/ai-engine';

export default function StudioEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [project, setProject] = useState<{
    id: string;
    shareSlug: string;
    name: string;
    prompt: string;
    type: string;
    model: string;
    visibility: string;
    workspaceAccess: string;
    publicPermission: string;
    isTemplate: boolean;
    showWatermark: boolean;
    files: Record<string, VirtualFile>;
    screens: ProjectScreen[];
    messages: ChatMessage[];
    versions: ProjectVersion[];
    comments: SpatialComment[];
    collaborators: Array<{ email: string; role: string }>;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'preview' | 'visual-edit' | 'comments' | 'screens' | 'code'
  >('preview');
  const [viewportPreset, setViewportPreset] = useState<
    'responsive' | 'desktop' | 'mobile' | 'custom'
  >('responsive');
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(768);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);

  // Prompt & /Commands state
  const [promptInput, setPromptInput] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<string>('');
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [sendingPrompt, setSendingPrompt] = useState(false);

  // Visual Edit state
  const [selectedElement, setSelectedElement] = useState<{
    tagName: string;
    text: string;
    className: string;
    color: string;
    bgColor: string;
    fontSize: string;
    borderRadius: string;
  } | null>(null);

  // Comments state
  const [commentFilter, setCommentFilter] = useState<'OPEN' | 'RESOLVED'>('OPEN');
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Screens canvas state
  const [canvasTool, setCanvasTool] = useState<'pointer' | 'hand' | 'interact'>('pointer');
  const [canvasZoom, setCanvasZoom] = useState(85);

  // Code IDE state
  const [activeFilePath, setActiveFilePath] = useState('App.tsx');
  const [codeDraft, setCodeDraft] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  // Share state
  const [collabEmail, setCollabEmail] = useState('');
  const [collabRole, setCollabRole] = useState<'Editor' | 'Viewer'>('Editor');
  const [copiedShare, setCopiedShare] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2600);
  };

  const loadProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    if (data.ok && data.project) {
      setProject(data.project);
      const firstFile =
        data.project.files['App.tsx'] ||
        Object.values(data.project.files)[0] as VirtualFile | undefined;
      if (firstFile) {
        setActiveFilePath(firstFile.path);
        setCodeDraft(firstFile.content);
      }
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Communicate studio mode to live iframe
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.postMessage({ type: 'MP_SET_MODE', mode: activeTab }, '*');
    }
  }, [activeTab, project]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'MP_ELEMENT_SELECTED') {
        setSelectedElement({
          tagName: e.data.tagName,
          text: e.data.text,
          className: e.data.className,
          color: e.data.color,
          bgColor: e.data.bgColor,
          fontSize: e.data.fontSize,
          borderRadius: e.data.borderRadius,
        });
      }
      if (e.data.type === 'MP_CANVAS_COMMENT_CLICK') {
        setPendingPin({ x: e.data.x, y: e.data.y });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const handleSendPrompt = async (customText?: string, customCmd?: string) => {
    const textToUse = customText !== undefined ? customText : promptInput;
    const cmdToUse = customCmd !== undefined ? customCmd : selectedCommand;
    if (!textToUse.trim() && !cmdToUse) return;

    setSendingPrompt(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToUse,
          command: cmdToUse || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.project) {
        setProject((prev) =>
          prev
            ? {
                ...prev,
                files: data.project.files,
                screens: data.project.screens,
                messages: data.project.messages,
                versions: data.project.versions,
              }
            : null
        );
        setPromptInput('');
        setSelectedCommand('');
        showToast('Updated design & generated new version snapshot');
      }
    } finally {
      setSendingPrompt(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    const res = await fetch(`/api/projects/${projectId}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restoreVersionNumber: versionNumber }),
    });
    const data = await res.json();
    if (data.ok && data.project) {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              files: data.project.files,
              screens: data.project.screens,
              messages: data.project.messages,
            }
          : null
      );
      setVersionDrawerOpen(false);
      showToast(`Restored to Version ${versionNumber}`);
    }
  };

  const handleApplyVisualEdit = () => {
    if (!selectedElement || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      {
        type: 'MP_APPLY_VISUAL_EDIT',
        text: selectedElement.text,
        color: selectedElement.color,
        bgColor: selectedElement.bgColor,
        fontSize: selectedElement.fontSize,
        borderRadius: selectedElement.borderRadius,
      },
      '*'
    );
    showToast('Applied visual DOM edit to live preview');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const pin = pendingPin || { x: 50, y: 40 };
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screenId: project?.screens[0]?.id || 'screen_main',
        x: pin.x,
        y: pin.y,
        content: newCommentText,
      }),
    });
    const data = await res.json();
    if (data.ok && project) {
      setProject({ ...project, comments: data.comments });
      setNewCommentText('');
      setPendingPin(null);
    }
  };

  const handleToggleCommentStatus = async (commentId: string, nextStatus: 'OPEN' | 'RESOLVED') => {
    const res = await fetch(`/api/projects/${projectId}/comments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId, status: nextStatus }),
    });
    const data = await res.json();
    if (data.ok && project) {
      setProject({ ...project, comments: data.comments });
    }
  };

  const handleSaveCode = async () => {
    if (!project) return;
    setSavingCode(true);
    try {
      const updatedFiles = {
        ...project.files,
        [activeFilePath]: {
          ...project.files[activeFilePath],
          path: activeFilePath,
          content: codeDraft,
        },
      };
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: updatedFiles }),
      });
      const data = await res.json();
      if (data.ok) {
        setProject({ ...project, files: updatedFiles });
        showToast(`Saved ${activeFilePath}`);
      }
    } finally {
      setSavingCode(false);
    }
  };

  const handleUpdateShareSettings = async (updates: Record<string, unknown>) => {
    if (!project) return;
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.ok && data.project) {
      setProject((prev) => (prev ? { ...prev, ...updates } : null));
      showToast('Updated sharing settings');
    }
  };

  const handleDownloadCodeBundle = () => {
    if (!project) return;
    const bundleText = Object.values(project.files)
      .map((f) => `// === FILE: ${f.path} ===\n${f.content}\n`)
      .join('\n');
    const blob = new Blob([bundleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.shareSlug}-source.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded project source bundle');
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-xs text-slate-500">
        Loading Magic Patterns Studio...
      </div>
    );
  }

  const mainScreen = project.screens[0];
  const filteredComments = project.comments.filter((c) => c.status === commentFilter);

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          data-testid="studio-toast"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Studio Header Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Back & Project Name + Actions */}
        <div className="flex items-center gap-2 min-w-0 relative">
          <Link
            href="/dashboard"
            data-testid="studio-back-btn"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <input
            data-testid="studio-project-title"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            onBlur={() => handleUpdateShareSettings({ name: project.name })}
            className="text-xs sm:text-sm font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-1 rounded-lg outline-none border border-transparent focus:border-slate-200 truncate max-w-[180px] sm:max-w-[240px]"
          />
          <button
            data-testid="studio-actions-menu-btn"
            onClick={() => setActionsMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            title="Editor actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {actionsMenuOpen && (
            <div className="absolute left-10 top-11 z-50 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs space-y-0.5">
              <button
                onClick={() => {
                  setActionsMenuOpen(false);
                  setVersionDrawerOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
              >
                <History className="w-3.5 h-3.5" />
                <span>Version history ({project.versions.length})</span>
              </button>
              <button
                onClick={async () => {
                  setActionsMenuOpen(false);
                  const res = await fetch(`/api/projects/${project.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fork' }),
                  });
                  const d = await res.json();
                  if (d.ok && d.project) router.push(`/c/${d.project.id}`);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Fork / Duplicate</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'preview', label: 'Preview', icon: Eye },
              { id: 'visual-edit', label: 'Visual Edit', icon: MousePointerClick },
              {
                id: 'comments',
                label: `Comments${project.comments.length ? ` (${project.comments.length})` : ''}`,
                icon: MessageSquare,
              },
              {
                id: 'screens',
                label: `Screens (${project.screens.length})`,
                icon: LayoutGrid,
              },
              { id: 'code', label: 'Code', icon: Code2 },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                data-testid={`studio-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Controls, Export & Share */}
        <div className="flex items-center gap-2 relative">
          {/* Controls Popover */}
          <button
            data-testid="studio-controls-btn"
            onClick={() => {
              setControlsOpen((v) => !v);
              setExportOpen(false);
            }}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Controls</span>
          </button>

          {controlsOpen && (
            <div
              data-testid="studio-controls-popover"
              className="absolute right-36 top-11 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-xs space-y-3"
            >
              <div className="font-bold text-slate-900">Viewport Size</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'responsive', label: 'Responsive' },
                    { id: 'desktop', label: 'Desktop (1280px)' },
                    { id: 'mobile', label: 'Mobile (390px)' },
                    { id: 'custom', label: 'Custom' },
                  ] as const
                ).map((vp) => (
                  <button
                    key={vp.id}
                    data-testid={`viewport-preset-${vp.id}`}
                    onClick={() => setViewportPreset(vp.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-left font-medium ${
                      viewportPreset === vp.id
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {vp.label}
                  </button>
                ))}
              </div>
              {viewportPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-slate-200"
                    placeholder="Width"
                  />
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="px-2 py-1 rounded border border-slate-200"
                    placeholder="Height"
                  />
                </div>
              )}
              <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                <Link
                  href={`/p/${project.shareSlug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:underline"
                >
                  <span>Open in new tab</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Export Dropdown */}
          <button
            data-testid="studio-export-btn"
            onClick={() => {
              setExportOpen((v) => !v);
              setControlsOpen(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {exportOpen && (
            <div
              data-testid="studio-export-menu"
              className="absolute right-20 top-11 z-50 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 text-xs space-y-0.5"
            >
              <button
                data-testid="export-to-mcp-btn"
                onClick={() => {
                  setExportOpen(false);
                  setMcpModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-800"
              >
                <Terminal className="w-4 h-4 text-indigo-600" />
                <div>
                  <div className="font-semibold">Export to MCP</div>
                  <div className="text-[10px] text-slate-400">Claude Code, Cursor, Codex</div>
                </div>
              </button>
              <button
                data-testid="export-to-github-btn"
                onClick={() => {
                  setExportOpen(false);
                  setGithubModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-800"
              >
                <Github className="w-4 h-4 text-slate-900" />
                <div>
                  <div className="font-semibold">Sync to GitHub</div>
                  <div className="text-[10px] text-slate-400">Push PR to acme/web</div>
                </div>
              </button>
              <button
                data-testid="export-to-figma-btn"
                onClick={() => {
                  setExportOpen(false);
                  navigator.clipboard?.writeText(`https://www.magicpatterns.com/p/${project.shareSlug}`);
                  showToast('Copied editable Figma layer payload to clipboard');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-800"
              >
                <Figma className="w-4 h-4 text-pink-600" />
                <div>
                  <div className="font-semibold">Copy to Figma</div>
                  <div className="text-[10px] text-slate-400">Paste directly into Figma</div>
                </div>
              </button>
              <button
                data-testid="export-download-code-btn"
                onClick={() => {
                  setExportOpen(false);
                  handleDownloadCodeBundle();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-left font-medium text-slate-800"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-semibold">Download Code</div>
                  <div className="text-[10px] text-slate-400">React + Tailwind bundle</div>
                </div>
              </button>
            </div>
          )}

          {/* Share Button */}
          <button
            data-testid="studio-share-btn"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* Main Split Studio Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left AI Chat & Iteration Sidebar */}
        <aside className="w-full lg:w-[370px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 max-h-[42vh] lg:max-h-none">
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {project.messages.map((msg) => (
              <div
                key={msg.id}
                className={`space-y-2 ${
                  msg.role === 'user'
                    ? 'bg-slate-100 text-slate-900 p-3 rounded-2xl ml-6 font-medium'
                    : 'bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs'
                }`}
              >
                {msg.role === 'assistant' && (msg.thoughtSeconds || msg.toolsUsed) && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Thought for {msg.thoughtSeconds || 5}s</span>
                    <span>•</span>
                    <span>Used {msg.toolsUsed || 1} tool</span>
                  </div>
                )}

                {msg.edits && msg.edits.length > 0 && (
                  <div className="space-y-1 py-1">
                    {msg.edits.map((ed, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-mono"
                      >
                        <span className="truncate">
                          <strong className="text-slate-700">{ed.action}</strong> {ed.file}
                        </span>
                        <span className="text-emerald-600 font-bold">+{ed.additions}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-slate-800 leading-relaxed">{msg.content}</div>

                {msg.bullets && msg.bullets.length > 0 && (
                  <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
                    {msg.bullets.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                )}

                {msg.versionNumber && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-[11px]">
                    <span className="font-semibold text-indigo-600">
                      Snapshot v{msg.versionNumber}
                    </span>
                    <button
                      onClick={() => handleRestoreVersion(msg.versionNumber!)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Restore v{msg.versionNumber}
                    </button>
                  </div>
                )}

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {msg.suggestions.map((sug) => (
                      <button
                        key={sug}
                        data-testid={`suggestion-chip-${sug}`}
                        onClick={() => handleSendPrompt(sug)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Prompt & /Command Composer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/60 space-y-2 relative">
            {commandsOpen && (
              <div
                data-testid="slash-commands-popover"
                className="absolute left-3 right-3 bottom-28 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 text-xs space-y-0.5"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400">
                  Studio /Commands
                </div>
                {[
                  { cmd: 'Ask', desc: 'Ask questions about architecture or UX' },
                  { cmd: 'Plan', desc: 'Generate a multi-step component plan' },
                  { cmd: 'Inspiration', desc: 'Explore visual variations & palettes' },
                  { cmd: 'Debug', desc: 'Fix layout, state, or responsiveness issues' },
                  { cmd: 'Polish', desc: 'Refine spacing, shadows, and Plan Breakdown' },
                ].map((item) => (
                  <button
                    key={item.cmd}
                    type="button"
                    data-testid={`slash-cmd-${item.cmd.toLowerCase()}`}
                    onClick={() => {
                      setSelectedCommand(item.cmd);
                      setCommandsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 text-left"
                  >
                    <span className="font-bold text-indigo-700">/{item.cmd}</span>
                    <span className="text-[11px] text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs space-y-2">
              {selectedCommand && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                  <span>/{selectedCommand}</span>
                  <button onClick={() => setSelectedCommand('')}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <textarea
                data-testid="studio-chat-input"
                rows={2}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask for changes, e.g. 'Add dark mode variant' or type /..."
                className="w-full text-xs text-slate-900 placeholder:text-slate-400 outline-none resize-none"
              />
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="open-slash-commands-btn"
                    onClick={() => setCommandsOpen((v) => !v)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                  >
                    /Commands
                  </button>
                  <span className="text-[11px] text-slate-400">{project.model}</span>
                </div>
                <button
                  data-testid="studio-send-prompt-btn"
                  disabled={sendingPrompt}
                  onClick={() => handleSendPrompt()}
                  className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Primary Canvas / Studio Area */}
        <section className="flex-1 flex flex-col min-w-0 min-h-0 relative bg-slate-100/80 mp-dot-grid">
          {/* TAB 1, 2, 3: Preview / Visual Edit / Comments Live Iframe */}
          {(activeTab === 'preview' ||
            activeTab === 'visual-edit' ||
            activeTab === 'comments') && (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto relative">
                <div
                  className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden transition-all relative"
                  style={{
                    width:
                      viewportPreset === 'mobile'
                        ? '390px'
                        : viewportPreset === 'desktop'
                        ? '1280px'
                        : viewportPreset === 'custom'
                        ? `${customWidth}px`
                        : '100%',
                    height:
                      viewportPreset === 'mobile'
                        ? '844px'
                        : viewportPreset === 'custom'
                        ? `${customHeight}px`
                        : '100%',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    title={project.name}
                    srcDoc={mainScreen?.htmlPreview || ''}
                    className="w-full h-full border-0"
                  />

                  {/* Spatial Comment Pins Overlay */}
                  {activeTab === 'comments' &&
                    filteredComments.map((cmt, idx) => (
                      <div
                        key={cmt.id}
                        style={{ left: `${cmt.x}%`, top: `${cmt.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white cursor-pointer">
                          {idx + 1}
                        </div>
                        <div className="hidden group-hover:block absolute left-8 top-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs space-y-1 z-30">
                          <div className="font-bold text-slate-900">{cmt.authorName}</div>
                          <div className="text-slate-600">{cmt.content}</div>
                        </div>
                      </div>
                    ))}

                  {project.showWatermark && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/85 text-white text-[10px] font-semibold backdrop-blur-xs">
                      Built with Magic Patterns
                    </div>
                  )}
                </div>
              </div>

              {/* Right Inspector Drawer for Visual Edit */}
              {activeTab === 'visual-edit' && (
                <div
                  data-testid="visual-edit-inspector"
                  className="w-72 bg-white border-l border-slate-200 p-4 space-y-4 text-xs overflow-y-auto shrink-0"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <MousePointerClick className="w-4 h-4 text-indigo-600" />
                    <span>Visual DOM Inspector</span>
                  </div>
                  {!selectedElement ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 leading-relaxed">
                      Click any element inside the live preview canvas to inspect and customize its
                      text, colors, typography, and border radius.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-mono font-bold w-fit">
                        &lt;{selectedElement.tagName}&gt;
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Element Text
                        </label>
                        <input
                          data-testid="visual-edit-text-input"
                          value={selectedElement.text}
                          onChange={(e) =>
                            setSelectedElement({ ...selectedElement, text: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Text Color
                        </label>
                        <input
                          value={selectedElement.color}
                          onChange={(e) =>
                            setSelectedElement({ ...selectedElement, color: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Font Size
                        </label>
                        <input
                          value={selectedElement.fontSize}
                          onChange={(e) =>
                            setSelectedElement({ ...selectedElement, fontSize: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <button
                        data-testid="apply-visual-edit-btn"
                        onClick={handleApplyVisualEdit}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      >
                        Apply DOM Changes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Right Sidebar for Spatial Comments */}
              {activeTab === 'comments' && (
                <div
                  data-testid="comments-sidebar"
                  className="w-80 bg-white border-l border-slate-200 p-4 flex flex-col justify-between text-xs shrink-0"
                >
                  <div className="space-y-4 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Spatial Comments</span>
                      <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px]">
                        <button
                          onClick={() => setCommentFilter('OPEN')}
                          className={`px-2 py-1 rounded-md font-semibold ${
                            commentFilter === 'OPEN' ? 'bg-white text-slate-900 shadow-2xs' : ''
                          }`}
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setCommentFilter('RESOLVED')}
                          className={`px-2 py-1 rounded-md font-semibold ${
                            commentFilter === 'RESOLVED' ? 'bg-white text-slate-900 shadow-2xs' : ''
                          }`}
                        >
                          Resolved
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {filteredComments.map((c, idx) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              #{idx + 1} {c.authorName}
                            </span>
                            <button
                              onClick={() =>
                                handleToggleCommentStatus(
                                  c.id,
                                  c.status === 'OPEN' ? 'RESOLVED' : 'OPEN'
                                )
                              }
                              className="text-[10px] font-semibold text-indigo-600 hover:underline"
                            >
                              {c.status === 'OPEN' ? 'Resolve' : 'Reopen'}
                            </button>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-[11px] text-slate-500">
                      {pendingPin
                        ? `Dropping pin at (${pendingPin.x}%, ${pendingPin.y}%)`
                        : 'Click anywhere on canvas or add a comment below:'}
                    </div>
                    <input
                      data-testid="new-comment-input"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Leave spatial feedback..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                    />
                    <button
                      data-testid="post-comment-btn"
                      type="submit"
                      className="w-full py-2 rounded-xl bg-slate-900 text-white font-semibold"
                    >
                      Post Comment Pin
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Multi-Screen Infinite Canvas */}
          {activeTab === 'screens' && (
            <div
              data-testid="screens-canvas-view"
              className="flex-1 flex flex-col justify-between p-6 overflow-auto relative"
            >
              <div className="flex items-center justify-between z-10">
                <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs font-semibold">
                  {project.screens.length} {project.screens.length === 1 ? 'screen' : 'screens'} on
                  canvas • Zoom {canvasZoom}%
                </div>
                <button
                  data-testid="add-screen-btn"
                  onClick={() => handleSendPrompt('Add mobile screen variant')}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Screen</span>
                </button>
              </div>

              <div
                className="flex items-start gap-8 py-8 overflow-x-auto"
                style={{ transform: `scale(${canvasZoom / 100})`, transformOrigin: 'top left' }}
              >
                {project.screens.map((scr) => (
                  <div
                    key={scr.id}
                    className="bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden shrink-0"
                    style={{ width: scr.device === 'mobile' ? 390 : 720, height: 520 }}
                  >
                    <div className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold flex items-center justify-between">
                      <span>
                        {scr.name} ({scr.route})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {scr.width}×{scr.height}
                      </span>
                    </div>
                    <iframe
                      title={scr.name}
                      srcDoc={scr.htmlPreview}
                      className="w-full h-full border-0"
                    />
                  </div>
                ))}
              </div>

              {/* Bottom Floating Canvas Toolbar */}
              <div className="mx-auto flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl px-3 py-1.5 z-10 text-xs">
                {[
                  { id: 'pointer', label: 'Pointer', icon: MousePointer },
                  { id: 'hand', label: 'Hand', icon: Hand },
                  { id: 'interact', label: 'Interact', icon: Play },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCanvasTool(t.id as 'pointer' | 'hand' | 'interact')}
                      className={`px-2.5 py-1.5 rounded-xl font-semibold flex items-center gap-1 ${
                        canvasTool === t.id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <button
                  onClick={() => setCanvasZoom((z) => Math.max(50, z - 10))}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1">{canvasZoom}%</span>
                <button
                  onClick={() => setCanvasZoom((z) => Math.min(130, z + 10))}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Multi-File Code IDE */}
          {activeTab === 'code' && (
            <div
              data-testid="code-ide-view"
              className="flex-1 flex min-h-0 bg-slate-950 text-slate-100 overflow-hidden"
            >
              {/* File Tree */}
              <div className="w-56 border-r border-slate-800 p-3 space-y-1 text-xs overflow-y-auto shrink-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Project Files
                </div>
                {Object.keys(project.files).map((filePath) => (
                  <button
                    key={filePath}
                    data-testid={`code-file-${filePath}`}
                    onClick={() => {
                      setActiveFilePath(filePath);
                      setCodeDraft(project.files[filePath]?.content || '');
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left font-mono text-[11px] ${
                      activeFilePath === filePath
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{filePath}</span>
                  </button>
                ))}
              </div>

              {/* Editor Pane */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="h-10 border-b border-slate-800 px-4 flex items-center justify-between text-xs bg-slate-900/60">
                  <span className="font-mono text-slate-300">{activeFilePath}</span>
                  <div className="flex items-center gap-2">
                    <button
                      data-testid="save-code-file-btn"
                      disabled={savingCode}
                      onClick={handleSaveCode}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                    >
                      {savingCode ? 'Saving...' : 'Save File'}
                    </button>
                    <button
                      onClick={handleDownloadCodeBundle}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
                    >
                      Download Bundle
                    </button>
                  </div>
                </div>
                <textarea
                  data-testid="code-editor-textarea"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value)}
                  className="flex-1 w-full p-4 bg-slate-950 text-emerald-300 font-mono text-xs leading-relaxed outline-none resize-none"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Share & Permissions Modal */}
      {shareOpen && (
        <div
          data-testid="studio-share-modal"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Share & Permissions</h3>
                <p className="text-slate-500">
                  Invite collaborators, publish as a workspace template, or configure public link
                  permissions.
                </p>
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invite Collaborator */}
            <div className="flex gap-2">
              <input
                value={collabEmail}
                onChange={(e) => setCollabEmail(e.target.value)}
                placeholder="Invite collaborator by email..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 outline-none"
              />
              <select
                value={collabRole}
                onChange={(e) => setCollabRole(e.target.value as 'Editor' | 'Viewer')}
                className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>
              <button
                onClick={() => {
                  if (!collabEmail.trim()) return;
                  const next = [
                    ...project.collaborators,
                    { email: collabEmail.trim(), role: collabRole },
                  ];
                  handleUpdateShareSettings({ collaborators: next });
                  setCollabEmail('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-semibold"
              >
                Invite
              </button>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Publish as Workspace Template</div>
                  <div className="text-[11px] text-slate-500">
                    Allow team members to fork this design from `/dashboard/templates`
                  </div>
                </div>
                <input
                  data-testid="share-template-toggle"
                  type="checkbox"
                  checked={project.isTemplate}
                  onChange={(e) => handleUpdateShareSettings({ isTemplate: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Public Link Permission</div>
                  <div className="text-[11px] text-slate-500">
                    Control whether visitors can only preview or inspect code & fork
                  </div>
                </div>
                <select
                  data-testid="share-public-permission-select"
                  value={project.publicPermission}
                  onChange={(e) =>
                    handleUpdateShareSettings({ publicPermission: e.target.value })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="PREVIEW_ONLY">Preview Only</option>
                  <option value="CODE_AND_FORK">Code & Fork Allowed</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    Show &ldquo;Built with Magic Patterns&rdquo; Watermark
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={project.showWatermark}
                  onChange={(e) => handleUpdateShareSettings({ showWatermark: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
              </div>
            </div>

            {/* Public Share URL */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
              <input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${
                  project.shareSlug
                }`}
                className="flex-1 bg-transparent text-slate-700 font-mono text-[11px] outline-none px-1"
              />
              <button
                data-testid="copy-share-link-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${window.location.origin}/p/${project.shareSlug}`
                  );
                  setCopiedShare(true);
                  setTimeout(() => setCopiedShare(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-1"
              >
                {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedShare ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export to MCP Modal */}
      {mcpModalOpen && (
        <div
          data-testid="export-mcp-modal"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Export to Coding Agents via MCP
              </h3>
              <button
                onClick={() => setMcpModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              Run this command in Claude Code, Cursor, Windsurf, or Codex to pull{' '}
              <strong>{project.name}</strong> and its design system tokens directly into your
              repository:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950 text-emerald-300 font-mono text-[11px]">
              npx @magicpatterns/mcp-server pull {project.id}
            </div>
          </div>
        </div>
      )}

      {/* Sync to GitHub Modal */}
      {githubModalOpen && (
        <div
          data-testid="export-github-modal"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Sync Component to GitHub</h3>
              <button
                onClick={() => setGithubModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600">
              Target Repository: <strong>acme/web</strong> • Branch:{' '}
              <code>feat/magicpatterns-{project.shareSlug}</code>
            </p>
            <button
              onClick={() => {
                setGithubModalOpen(false);
                showToast('Opened Pull Request #142 on acme/web');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold"
            >
              Create Pull Request on GitHub
            </button>
          </div>
        </div>
      )}

      {/* Version History Drawer Modal */}
      {versionDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Version History</h3>
              <button
                onClick={() => setVersionDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {project.versions.map((v) => (
                <div
                  key={v.versionNumber}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      Version {v.versionNumber} — {v.label}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(v.versionNumber)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
