'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, ArrowLeft } from 'lucide-react';

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'For individuals exploring AI UI generation and MagicOS.',
      features: [
        '100 starter free credits',
        'Access to Base (Shadcn) Design System',
        'Public & workspace preview links',
        'Export to React + Tailwind & Figma',
      ],
      cta: 'Current Plan',
      href: '/dashboard',
      highlight: false,
    },
    {
      name: 'Hobby',
      price: interval === 'yearly' ? '$15' : '$19',
      period: 'per user / month',
      description: 'For solo builders and indie makers shipping fast.',
      features: [
        '150 monthly AI generation credits',
        'Unlimited private projects & folders',
        'Remove "Built with Magic Patterns" watermark',
        'Custom Design Systems from GitHub & Figma',
      ],
      cta: 'Upgrade to Hobby',
      href: '/settings/subscription',
      highlight: false,
    },
    {
      name: 'Pro',
      price: interval === 'yearly' ? '$60' : '$75',
      period: 'per user / month',
      description: 'For product & design teams collaborating on MagicOS.',
      features: [
        '500 monthly credits (rolls over)',
        'Unlimited Slide Decks & MagicOS canvases',
        'Full MCP Server handoff (Claude Code, Cursor, Codex)',
        'Custom SKILL.md & MCP Connectors (Notion, Linear)',
      ],
      cta: 'Upgrade to Pro',
      href: '/settings/subscription',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'annual contract',
      description: 'For organizations requiring SAML SSO, RBAC & audit compliance.',
      features: [
        'Unlimited custom credit pools',
        'SAML SSO, SCIM & domain enforcement',
        'Invite-only governance & immutable audit logs',
        'Dedicated solutions engineer & SLA',
      ],
      cta: 'Contact Sales',
      href: '/settings/workspace',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </Link>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
          >
            Sign in
          </Link>
        </div>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent, Predictable Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Scale from first prompt to enterprise design system
          </h1>
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 text-xs font-semibold">
            <button
              onClick={() => setInterval('monthly')}
              className={`px-4 py-1.5 rounded-lg transition ${
                interval === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`px-4 py-1.5 rounded-lg transition ${
                interval === 'yearly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 flex flex-col justify-between border ${
                p.highlight
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                  : 'bg-white text-slate-900 border-slate-200 shadow-xs'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  {p.highlight && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                      Most Popular
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-3xl font-extrabold">{p.price}</span>
                  <span
                    className={`text-xs ml-1.5 ${
                      p.highlight ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {p.period}
                  </span>
                </div>
                <p
                  className={`text-xs leading-relaxed ${
                    p.highlight ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {p.description}
                </p>
                <ul className="space-y-2.5 pt-2 text-xs">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          p.highlight ? 'text-indigo-400' : 'text-indigo-600'
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={p.href}
                className={`mt-6 w-full py-2.5 rounded-xl text-center text-xs font-semibold transition ${
                  p.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
