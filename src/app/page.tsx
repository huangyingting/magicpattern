'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Layers,
  Presentation,
  Palette,
  Workflow,
  ShieldCheck,
  Terminal,
  CheckCircle2,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/dashboard?prompt=${encodeURIComponent(prompt || 'Create a SaaS revenue metric card')}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 font-extrabold text-base tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                MP
              </span>
              <span>Magic Patterns</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <Link href="/dashboard" className="hover:text-slate-900">
                Product
              </Link>
              <Link href="/os/bVtYnuouBP1paP91KjgwML" className="hover:text-slate-900 flex items-center gap-1">
                <span>MagicOS</span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px]">
                  New
                </span>
              </Link>
              <Link href="/design-systems" className="hover:text-slate-900">
                Design Systems
              </Link>
              <Link href="/pricing" className="hover:text-slate-900">
                Pricing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Introducing MagicOS — The Infinite Canvas for AI Product Teams</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
          Design, prototype, and ship UI <br className="hidden sm:inline" />
          <span className="text-indigo-600">with your own Design System.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
          Turn PRDs, GitHub repositories, and Figma tokens into interactive multi-screen prototypes,
          executive slide decks, and production React + Tailwind code ready for Claude Code & Cursor.
        </p>

        {/* Interactive Hero Composer */}
        <form
          onSubmit={handleHeroSubmit}
          className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-3 space-y-3 text-left"
        >
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a UI component, dashboard, checkout flow, or slide deck..."
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none p-2"
          />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                Base (Shadcn)
              </span>
              <span className="hidden sm:inline px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                Auto Model
              </span>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <span>Generate Design</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Quick Feature Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-left">
          <Link
            href="/c/tvajgfewuihg5kqchnvgxv"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition shadow-2xs"
          >
            <Layers className="w-5 h-5 text-indigo-600 mb-2" />
            <div className="text-xs font-bold text-slate-900">AI Design Studio</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Preview, Visual Edit & Code IDE</div>
          </Link>
          <Link
            href="/dashboard?mode=SLIDE_DECK"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition shadow-2xs"
          >
            <Presentation className="w-5 h-5 text-purple-600 mb-2" />
            <div className="text-xs font-bold text-slate-900">Slide Decks</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Outline-to-presentation builder</div>
          </Link>
          <Link
            href="/design-systems"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition shadow-2xs"
          >
            <Palette className="w-5 h-5 text-emerald-600 mb-2" />
            <div className="text-xs font-bold text-slate-900">Design Systems</div>
            <div className="text-[11px] text-slate-500 mt-0.5">GitHub, Figma & Website sync</div>
          </Link>
          <Link
            href="/os/bVtYnuouBP1paP91KjgwML"
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 transition shadow-2xs"
          >
            <Workflow className="w-5 h-5 text-amber-600 mb-2" />
            <div className="text-xs font-bold text-slate-900">MagicOS Canvas</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Infinite context & MCP handoff</div>
          </Link>
        </div>
      </section>

      {/* Enterprise Invite-Only & Security Highlight */}
      <section className="bg-white border-y border-slate-200 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Invite-Only Workspace Governance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Single-use, expiring cryptographic invitation tokens with role assignment (Admin,
              Editor, Viewer), token rotation, revocation, and immutable audit logging.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <Terminal className="w-6 h-6 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Model Context Protocol (MCP)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pull meeting notes and specs from Notion, Linear, Granola, and Jira—and hand off
              approved UI components directly to Claude Code, Cursor, and Codex.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <CheckCircle2 className="w-6 h-6 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Custom AI Skills (SKILL.md)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardize motion physics, WCAG 2.1 AA accessibility audits, and enterprise layout
              conventions across every team prompt.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
