'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import {
  FolderPlus,
  Folder,
  Search,
  LayoutGrid,
  List,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  color: string;
  projectCount: number;
}

interface ProjectItem {
  id: string;
  shareSlug: string;
  name: string;
  prompt: string;
  type: string;
  folderId: string | null;
  isTemplate: boolean;
  updatedAt: string;
}

interface CanvasItem {
  id: string;
  name: string;
  updatedAt: string;
}

export default function FilesPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DESIGNS' | 'CANVAS' | 'TEMPLATES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#4F46E5');

  const loadFiles = async () => {
    const [fldRes, prjRes, cnvRes] = await Promise.all([
      fetch('/api/folders').then((r) => r.json()),
      fetch(
        `/api/projects?q=${encodeURIComponent(searchQuery)}${
          selectedFolderId ? `&folderId=${selectedFolderId}` : ''
        }`
      ).then((r) => r.json()),
      fetch('/api/canvases').then((r) => r.json()).catch(() => ({ ok: false })),
    ]);
    if (fldRes.ok) setFolders(fldRes.folders);
    if (prjRes.ok) setProjects(prjRes.projects);
    if (cnvRes.ok && Array.isArray(cnvRes.canvases)) setCanvases(cnvRes.canvases);
  };

  useEffect(() => {
    loadFiles();
  }, [searchQuery, selectedFolderId]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName, color: newFolderColor }),
    });
    const data = await res.json();
    if (data.ok) {
      setNewFolderName('');
      setNewFolderModalOpen(false);
      loadFiles();
    }
  };

  const handleDeleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    loadFiles();
  };

  const handleDeleteCanvas = async (id: string) => {
    await fetch(`/api/canvases/${id}`, { method: 'DELETE' });
    loadFiles();
  };

  const displayedProjects =
    activeTab === 'CANVAS'
      ? []
      : projects.filter((p) => {
          if (activeTab === 'DESIGNS') return p.type === 'DESIGN';
          if (activeTab === 'TEMPLATES') return p.isTemplate;
          return true;
        });

  const displayedCanvases =
    activeTab === 'ALL' || activeTab === 'CANVAS'
      ? canvases.filter((c) =>
          searchQuery ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
        )
      : [];

  return (
    <WorkspaceShell>
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Workspace Files</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize designs, slide decks, and MagicOS canvases into shared workspace folders.
            </p>
          </div>
          <button
            data-testid="new-folder-btn"
            onClick={() => setNewFolderModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold w-fit"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Folders Strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSelectedFolderId('')}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
              selectedFolderId === ''
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Folders
          </button>
          {folders.map((fld) => (
            <button
              key={fld.id}
              data-testid={`folder-pill-${fld.name}`}
              onClick={() => setSelectedFolderId(fld.id === selectedFolderId ? '' : fld.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
                selectedFolderId === fld.id
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" style={{ color: fld.color }} />
              <span>{fld.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {fld.projectCount}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-fit">
            {(
              [
                { id: 'ALL', label: 'All Files' },
                { id: 'DESIGNS', label: 'Designs' },
                { id: 'CANVAS', label: 'Canvas' },
                { id: 'TEMPLATES', label: 'Templates' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === t.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none"
              />
            </div>
            <div className="flex items-center border border-slate-200 rounded-xl bg-white p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg ${
                  viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
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

        {/* File List / Grid */}
        <div
          className={
            viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'
          }
        >
          {displayedProjects.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-300 transition shadow-2xs"
            >
              <div className="min-w-0 pr-3">
                <Link
                  href={`/c/${p.id}`}
                  className="text-xs font-bold text-slate-900 hover:text-indigo-600 block truncate"
                >
                  {p.name}
                </Link>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.prompt}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/c/${p.id}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDeleteProject(p.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                  title="Delete project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {displayedCanvases.map((c) => (
            <div
              key={c.id}
              data-testid={`canvas-file-${c.id}`}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-300 transition shadow-2xs"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    MagicOS
                  </span>
                  <Link
                    href={`/os/${c.id}`}
                    className="text-xs font-bold text-slate-900 hover:text-indigo-600 block truncate"
                  >
                    {c.name}
                  </Link>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Infinite Spatial Context Canvas
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={`/os/${c.id}`}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[11px] font-semibold text-indigo-700"
                >
                  Open Canvas
                </Link>
                <button
                  onClick={() => handleDeleteCanvas(c.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                  title="Delete canvas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* New Folder Modal */}
        {newFolderModalOpen && (
          <div
            data-testid="new-folder-modal"
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <form
              onSubmit={handleCreateFolder}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Create New Folder</h3>
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Folder Name
                </label>
                <input
                  data-testid="new-folder-name-input"
                  autoFocus
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Mobile App V2"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  data-testid="confirm-create-folder-btn"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
