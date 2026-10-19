export interface VirtualFile {
  path: string;
  language: string;
  content: string;
}

export interface ProjectScreen {
  id: string;
  name: string;
  route: string;
  width: number;
  height: number;
  x: number;
  y: number;
  device: 'desktop' | 'mobile';
  htmlPreview: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  command?: string;
  thoughtSeconds?: number;
  toolsUsed?: number;
  edits?: Array<{ file: string; action: 'Replaced' | 'Created' | 'Updated'; additions: number }>;
  bullets?: string[];
  suggestions?: string[];
  versionNumber?: number;
  createdAt: string;
}

export interface ProjectVersion {
  versionNumber: number;
  label: string;
  prompt: string;
  createdAt: string;
  filesJson: string;
  screensJson: string;
}

export interface SpatialComment {
  id: string;
  screenId: string;
  x: number;
  y: number;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  replies: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
  }>;
}

const INTERACTIVE_BRIDGE_SCRIPT = `
<script>
(function() {
  let mode = 'preview';
  let selectedEl = null;

  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'MP_SET_MODE') {
      mode = e.data.mode || 'preview';
      document.body.style.cursor = mode === 'comments' ? 'crosshair' : mode === 'visual-edit' ? 'pointer' : 'default';
      if (mode !== 'visual-edit' && selectedEl) {
        selectedEl.style.outline = '';
        selectedEl = null;
      }
    }
    if (e.data.type === 'MP_APPLY_VISUAL_EDIT' && selectedEl) {
      if (typeof e.data.text === 'string') selectedEl.innerText = e.data.text;
      if (typeof e.data.color === 'string' && e.data.color) selectedEl.style.color = e.data.color;
      if (typeof e.data.bgColor === 'string' && e.data.bgColor) selectedEl.style.backgroundColor = e.data.bgColor;
      if (typeof e.data.fontSize === 'string' && e.data.fontSize) selectedEl.style.fontSize = e.data.fontSize;
      if (typeof e.data.borderRadius === 'string' && e.data.borderRadius) selectedEl.style.borderRadius = e.data.borderRadius;
      window.parent.postMessage({
        type: 'MP_HTML_UPDATED',
        html: document.documentElement.outerHTML
      }, '*');
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (mode !== 'visual-edit') return;
    const t = e.target;
    if (t && t !== document.body && t !== document.documentElement && t !== selectedEl) {
      t.style.outline = '2px dashed #4F46E5';
      t.style.outlineOffset = '2px';
    }
  });

  document.addEventListener('mouseout', function(e) {
    if (mode !== 'visual-edit') return;
    const t = e.target;
    if (t && t !== selectedEl) {
      t.style.outline = '';
    }
  });

  document.addEventListener('click', function(e) {
    if (mode === 'visual-edit') {
      e.preventDefault();
      e.stopPropagation();
      if (selectedEl) selectedEl.style.outline = '';
      selectedEl = e.target;
      selectedEl.style.outline = '2px solid #4F46E5';
      selectedEl.style.outlineOffset = '2px';
      const cs = window.getComputedStyle(selectedEl);
      window.parent.postMessage({
        type: 'MP_ELEMENT_SELECTED',
        tagName: selectedEl.tagName.toLowerCase(),
        text: (selectedEl.innerText || '').slice(0, 200),
        className: selectedEl.className || '',
        color: cs.color,
        bgColor: cs.backgroundColor,
        fontSize: cs.fontSize,
        borderRadius: cs.borderRadius
      }, '*');
    } else if (mode === 'comments') {
      e.preventDefault();
      e.stopPropagation();
      const rect = document.body.getBoundingClientRect();
      const xPct = Math.round((e.clientX / Math.max(window.innerWidth, 1)) * 100);
      const yPct = Math.round((e.clientY / Math.max(window.innerHeight, 1)) * 100);
      window.parent.postMessage({
        type: 'MP_CANVAS_COMMENT_CLICK',
        x: xPct,
        y: yPct
      }, '*');
    }
  }, true);
})();
</script>
`;

export function buildRevenueCardHtml(options?: {
  darkMode?: boolean;
  showComparison?: boolean;
  showPlanBreakdown?: boolean;
  accentColor?: string;
  headlineTitle?: string;
}): string {
  const dark = Boolean(options?.darkMode);
  const accent = options?.accentColor || '#4F46E5';
  const title = options?.headlineTitle || 'Total Revenue';
  const bg = dark ? '#0B0F19' : '#F8FAFC';
  const cardBg = dark ? '#111827' : '#FFFFFF';
  const textMain = dark ? '#F9FAFB' : '#0F172A';
  const textSub = dark ? '#9CA3AF' : '#64748B';
  const borderCol = dark ? '#1F2937' : '#E2E8F0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: ${bg}; color: ${textMain}; font-family: Inter, system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; }
  .metric-card { background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: 20px; width: 100%; max-width: 680px; padding: 28px; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08); }
  .tab-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.15s; }
  .tab-btn.active { background: ${dark ? '#1F2937' : '#F1F5F9'}; color: ${textMain}; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
</style>
</head>
<body>
  <div class="metric-card" id="revenue-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
      <div>
        <div style="display:flex;align-items:center;gap:8px;color:${textSub};font-size:13px;font-weight:500;">
          <span style="display:inline-flex;width:24px;height:24px;border-radius:6px;background:${accent}18;color:${accent};align-items:center;justify-content:center;font-weight:700;">$</span>
          <span>${title}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:12px;margin-top:10px;flex-wrap:wrap;">
          <h1 id="rev-amount" style="font-size:36px;font-weight:800;letter-spacing:-0.03em;margin:0;">$84,230.50</h1>
          <span id="rev-badge" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:#DCFCE7;color:#15803D;font-size:12px;font-weight:700;">
            ↑ +14.2%
          </span>
          <span style="color:${textSub};font-size:12px;">+$10,480 vs last month</span>
        </div>
      </div>
      <div style="display:flex;background:${dark ? '#0F172A' : '#F8FAFC'};padding:4px;border-radius:10px;border:1px solid ${borderCol};" id="range-tabs">
        <button class="tab-btn" onclick="setRange('7D', '$19,420.00', '+8.4%')">7D</button>
        <button class="tab-btn" onclick="setRange('30D', '$62,180.00', '+11.9%')">30D</button>
        <button class="tab-btn" onclick="setRange('90D', '$74,910.00', '+12.8%')">90D</button>
        <button class="tab-btn active" onclick="setRange('1Y', '$84,230.50', '+14.2%')">1Y</button>
      </div>
    </div>

    <div style="margin-top:26px;position:relative;">
      <svg viewBox="0 0 600 200" style="width:100%;height:200px;overflow:visible;">
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
            <stop offset="100%" stop-color="${accent}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <line x1="40" y1="20" x2="580" y2="20" stroke="${borderCol}" stroke-dasharray="4 4" />
        <line x1="40" y1="75" x2="580" y2="75" stroke="${borderCol}" stroke-dasharray="4 4" />
        <line x1="40" y1="130" x2="580" y2="130" stroke="${borderCol}" stroke-dasharray="4 4" />
        <line x1="40" y1="180" x2="580" y2="180" stroke="${borderCol}" />
        <text x="0" y="24" fill="${textSub}" font-size="11">$90k</text>
        <text x="0" y="79" fill="${textSub}" font-size="11">$70k</text>
        <text x="0" y="134" fill="${textSub}" font-size="11">$50k</text>
        <text x="0" y="184" fill="${textSub}" font-size="11">$30k</text>
        <path d="M40,165 C90,158 130,145 175,138 C220,130 265,112 310,104 C355,96 400,75 445,62 C490,48 535,34 580,22 L580,180 L40,180 Z" fill="url(#revGrad)" />
        <path d="M40,165 C90,158 130,145 175,138 C220,130 265,112 310,104 C355,96 400,75 445,62 C490,48 535,34 580,22" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" />
        ${
          options?.showComparison
            ? `<path d="M40,175 C90,170 130,162 175,155 C220,148 265,138 310,128 C355,118 400,105 445,94 C490,82 535,70 580,58" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="5 5" />`
            : ''
        }
        <circle cx="580" cy="22" r="5" fill="${accent}" stroke="#fff" stroke-width="2" />
      </svg>
      <div style="display:flex;justify-content:space-between;padding-left:40px;margin-top:8px;color:${textSub};font-size:11px;">
        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
      </div>
    </div>

    ${
      options?.showPlanBreakdown
        ? `<div style="margin-top:20px;padding:14px;border-radius:12px;background:${dark ? '#1E293B' : '#F8FAFC'};border:1px solid ${borderCol};">
            <div style="font-size:12px;font-weight:700;margin-bottom:8px;">Revenue Breakdown by Plan Tier</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;font-size:12px;">
              <div><span style="color:${textSub};">Starter</span><div style="font-weight:700;margin-top:2px;">$18,400 (22%)</div></div>
              <div><span style="color:${textSub};">Business</span><div style="font-weight:700;margin-top:2px;">$42,110 (50%)</div></div>
              <div><span style="color:${textSub};">Enterprise</span><div style="font-weight:700;margin-top:2px;">$23,720 (28%)</div></div>
            </div>
          </div>`
        : ''
    }

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px;padding-top:20px;border-top:1px solid ${borderCol};">
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${textSub};">Avg. Monthly</div>
        <div style="font-size:16px;font-weight:700;margin-top:4px;">$7,019</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${textSub};">Best Month</div>
        <div style="font-size:16px;font-weight:700;margin-top:4px;">Dec ($84.2k)</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${textSub};">YoY Growth</div>
        <div style="font-size:16px;font-weight:700;color:#16A34A;margin-top:4px;">+115.9%</div>
      </div>
    </div>
  </div>
  <script>
    function setRange(label, amount, badge) {
      document.getElementById('rev-amount').innerText = amount;
      document.getElementById('rev-badge').innerText = '↑ ' + badge;
      document.querySelectorAll('#range-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === label);
      });
    }
  </script>
  ${INTERACTIVE_BRIDGE_SCRIPT}
</body>
</html>`;
}

export function buildSlideDeckHtml(title: string, slides: Array<{ heading: string; subtitle: string; bullets: string[]; kpi?: string }>): string {
  const slidesJson = JSON.stringify(slides);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white min-h-screen flex flex-col justify-between p-8 font-sans">
  <div class="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold w-fit mb-6">
      <span>SLIDE DECK PRESENTATION</span>
      <span>•</span>
      <span id="slide-counter">Slide 1 of ${slides.length}</span>
    </div>
    <div id="slide-card" class="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 shadow-2xl">
      <h1 id="slide-heading" class="text-4xl font-extrabold tracking-tight text-white mb-3">${slides[0]?.heading || title}</h1>
      <p id="slide-subtitle" class="text-lg text-slate-400 mb-8">${slides[0]?.subtitle || 'Executive overview & milestones'}</p>
      <ul id="slide-bullets" class="space-y-4 text-slate-200 text-base">
        ${(slides[0]?.bullets || []).map((b) => `<li class="flex items-start gap-3"><span class="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span><span>${b}</span></li>`).join('')}
      </ul>
    </div>
  </div>
  <div class="max-w-4xl w-full mx-auto flex items-center justify-between pt-6 border-t border-slate-800/80">
    <div class="text-xs text-slate-400">${title} • Built with Magic Patterns</div>
    <div class="flex items-center gap-2">
      <button onclick="prevSlide()" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold">← Previous</button>
      <button onclick="nextSlide()" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">Next Slide →</button>
    </div>
  </div>
  <script>
    const slides = ${slidesJson};
    let idx = 0;
    function render() {
      const s = slides[idx] || slides[0];
      document.getElementById('slide-counter').innerText = 'Slide ' + (idx + 1) + ' of ' + slides.length;
      document.getElementById('slide-heading').innerText = s.heading;
      document.getElementById('slide-subtitle').innerText = s.subtitle;
      document.getElementById('slide-bullets').innerHTML = (s.bullets || []).map(b =>
        '<li class="flex items-start gap-3"><span class="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0"></span><span>' + b + '</span></li>'
      ).join('');
    }
    function nextSlide() { idx = (idx + 1) % slides.length; render(); }
    function prevSlide() { idx = (idx - 1 + slides.length) % slides.length; render(); }
  </script>
  ${INTERACTIVE_BRIDGE_SCRIPT}
</body>
</html>`;
}

export function synthesizeProjectArtifacts(params: {
  name?: string;
  prompt: string;
  type?: 'DESIGN' | 'SLIDE_DECK';
  designSystemName?: string;
  accentColor?: string;
  outlineSlides?: Array<{ heading: string; subtitle: string; bullets: string[] }>;
}) {
  const isSlideDeck = params.type === 'SLIDE_DECK';
  const cleanPrompt = params.prompt.trim() || 'Create a clean SaaS analytics metric card with revenue chart and trend badge';
  const derivedName =
    params.name?.trim() ||
    (isSlideDeck
      ? cleanPrompt.slice(0, 42) || 'Quarterly Product Review Deck'
      : cleanPrompt.toLowerCase().includes('revenue')
      ? 'Revenue Metric Card'
      : cleanPrompt.toLowerCase().includes('checkout')
      ? 'Mobile Express Checkout'
      : cleanPrompt.slice(0, 38));

  const accent = params.accentColor || '#4F46E5';

  if (isSlideDeck) {
    const slides =
      params.outlineSlides && params.outlineSlides.length > 0
        ? params.outlineSlides
        : [
            {
              heading: derivedName,
              subtitle: 'Q4 Product Velocity, Adoption & Revenue Milestones',
              bullets: [
                'ARR expanded +115.9% YoY driven by self-serve product-led growth',
                'MagicOS infinite canvas adoption reached 68% of active design teams',
                'Mobile checkout redesign reduced cart abandonment by 34%',
              ],
            },
            {
              heading: 'Key Product Releases & Design System Impact',
              subtitle: 'Standardizing components across 14 engineering squads',
              bullets: [
                'Zero-drift token synchronization between Figma, GitHub, and Magic Patterns',
                'One-click MCP handoff to Claude Code, Cursor, and Codex',
                '99.98% uptime across live published preview links',
              ],
            },
            {
              heading: 'Next Quarter Roadmap & Goals',
              subtitle: 'Scaling collaborative real-time design workflows',
              bullets: [
                'Launch custom SKILL.md automated accessibility & motion audits',
                'Expand enterprise SSO, SCIM, and role-based audit governance',
                'Target 2.4x faster PRD-to-production cycle time',
              ],
            },
          ];

    const htmlPreview = buildSlideDeckHtml(derivedName, slides);
    const files: Record<string, VirtualFile> = {
      'App.tsx': {
        path: 'App.tsx',
        language: 'tsx',
        content: `import React, { useState } from 'react';\nimport { SlideDeck } from './components/SlideDeck';\n\nexport function App() {\n  return <SlideDeck title=${JSON.stringify(derivedName)} />;\n}\nexport default App;\n`,
      },
      'components/SlideDeck.tsx': {
        path: 'components/SlideDeck.tsx',
        language: 'tsx',
        content: `import React, { useState } from 'react';\n\nconst SLIDES = ${JSON.stringify(slides, null, 2)};\n\nexport function SlideDeck({ title }: { title: string }) {\n  const [index, setIndex] = useState(0);\n  const slide = SLIDES[index];\n  return (\n    <div className="min-h-screen bg-slate-950 text-white p-10 flex flex-col justify-between">\n      <div className="max-w-4xl mx-auto w-full">\n        <span className="text-xs font-semibold text-indigo-400">Slide {index + 1} of {SLIDES.length}</span>\n        <h1 className="text-4xl font-bold mt-2">{slide.heading}</h1>\n        <p className="text-slate-400 mt-2">{slide.subtitle}</p>\n      </div>\n    </div>\n  );\n}\n`,
      },
      'package.json': {
        path: 'package.json',
        language: 'json',
        content: JSON.stringify(
          {
            name: 'magic-patterns-slide-deck',
            version: '1.0.0',
            dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0', 'lucide-react': '^1.0.0' },
          },
          null,
          2
        ),
      },
    };

    const screens: ProjectScreen[] = slides.map((s, idx) => ({
      id: `screen_${idx + 1}`,
      name: `Slide ${idx + 1}: ${s.heading.slice(0, 24)}`,
      route: `/slide-${idx + 1}`,
      width: 1280,
      height: 720,
      x: idx * 1360,
      y: 0,
      device: 'desktop',
      htmlPreview: buildSlideDeckHtml(derivedName, [s, ...slides.filter((_, i) => i !== idx)]),
    }));

    const messages: ChatMessage[] = [
      {
        id: 'msg_1',
        role: 'user',
        content: cleanPrompt,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'msg_2',
        role: 'assistant',
        content: `Here's your interactive ${slides.length}-slide presentation deck for **${derivedName}**:`,
        thoughtSeconds: 5,
        toolsUsed: 1,
        edits: [
          { file: 'package.json', action: 'Replaced', additions: 12 },
          { file: 'components/SlideDeck.tsx', action: 'Created', additions: 68 },
          { file: 'App.tsx', action: 'Replaced', additions: 14 },
        ],
        bullets: [
          `Structured ${slides.length} executive slides with keyboard & button navigation`,
          `Applied dark presentation theme with ${params.designSystemName || 'Base'} tokens`,
          `Added individual slide frames to the Screens canvas for side-by-side review`,
        ],
        suggestions: [
          'Add a financial metrics comparison slide',
          'Switch presentation to light theme',
          'Add speaker notes drawer',
        ],
        versionNumber: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    const versions: ProjectVersion[] = [
      {
        versionNumber: 1,
        label: 'Initial slide deck generation',
        prompt: cleanPrompt,
        createdAt: new Date().toISOString(),
        filesJson: JSON.stringify(files),
        screensJson: JSON.stringify(screens),
      },
    ];

    return {
      name: derivedName,
      filesJson: JSON.stringify(files),
      screensJson: JSON.stringify(screens),
      messagesJson: JSON.stringify(messages),
      versionsJson: JSON.stringify(versions),
    };
  }

  // Standard UI Design Project
  const htmlPreview = buildRevenueCardHtml({
    accentColor: accent,
    headlineTitle: derivedName,
  });

  const files: Record<string, VirtualFile> = {
    'App.tsx': {
      path: 'App.tsx',
      language: 'tsx',
      content: `import React from 'react';
import { RevenueMetricCard } from './components/RevenueMetricCard';

export function App() {
  return (
    <main className="min-h-screen w-full bg-slate-50/70 flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-2xl">
        <RevenueMetricCard />
      </div>
    </main>
  );
}

export default App;
`,
    },
    'components/RevenueMetricCard.tsx': {
      path: 'components/RevenueMetricCard.tsx',
      language: 'tsx',
      content: `import React, { useState } from 'react';

export function RevenueMetricCard() {
  const [range, setRange] = useState<'7D' | '30D' | '90D' | '1Y'>('1Y');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">${derivedName}</p>
          <div className="mt-2 flex items-baseline gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">$84,230.50</h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              +14.2%
            </span>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['7D', '30D', '90D', '1Y'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={\`px-3 py-1 text-xs font-semibold rounded-md \${range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}\`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
    },
    'index.css': {
      path: 'index.css',
      language: 'css',
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --mp-accent: ${accent};\n}\n`,
    },
    'index.tsx': {
      path: 'index.tsx',
      language: 'tsx',
      content: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);\n`,
    },
    'package.json': {
      path: 'package.json',
      language: 'json',
      content: JSON.stringify(
        {
          name: 'magic-patterns-design',
          version: '1.0.0',
          private: true,
          dependencies: {
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '^1.24.0',
            tailwindcss: '^3.4.14',
          },
        },
        null,
        2
      ),
    },
    'tailwind.config.js': {
      path: 'tailwind.config.js',
      language: 'javascript',
      content: `module.exports = {\n  content: ['./**/*.{ts,tsx,html}'],\n  theme: { extend: { colors: { brand: '${accent}' } } },\n  plugins: [],\n};\n`,
    },
    'README.md': {
      path: 'README.md',
      language: 'markdown',
      content: `# ${derivedName}\n\nGenerated with Magic Patterns (${params.designSystemName || 'Base'} Design System).\n\n## Prompt\n> ${cleanPrompt}\n`,
    },
  };

  const screens: ProjectScreen[] = [
    {
      id: 'screen_main',
      name: 'Home',
      route: '/index',
      width: 1280,
      height: 900,
      x: 0,
      y: 0,
      device: 'desktop',
      htmlPreview,
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg_1',
      role: 'user',
      content: cleanPrompt,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'msg_2',
      role: 'assistant',
      content: `Here's the **${derivedName}** design with:`,
      thoughtSeconds: 6,
      toolsUsed: 1,
      edits: [
        { file: 'package.json', action: 'Replaced', additions: 16 },
        { file: 'index.css', action: 'Replaced', additions: 12 },
        { file: 'components/RevenueMetricCard.tsx', action: 'Created', additions: 94 },
        { file: 'App.tsx', action: 'Replaced', additions: 15 },
      ],
      bullets: [
        'Headline metric — $84,230.50 total revenue with a green +14.2% trend badge and dollar delta (+$10,480) vs. the previous period',
        'Time range switcher — interactive 7D / 30D / 90D / 1Y pill tabs that update the figure, badge, chart, and summary stats',
        'Area chart — smooth indigo gradient curve with subtle dashed gridlines and interactive hover states',
        'Footer breakdown — quick stats for average, peak period, and YoY growth',
      ],
      suggestions: [
        'Compare with previous period line',
        'Add breakdown by plan tier',
        'Add dark mode variant',
      ],
      versionNumber: 1,
      createdAt: new Date().toISOString(),
    },
  ];

  const versions: ProjectVersion[] = [
    {
      versionNumber: 1,
      label: 'Initial design generation',
      prompt: cleanPrompt,
      createdAt: new Date().toISOString(),
      filesJson: JSON.stringify(files),
      screensJson: JSON.stringify(screens),
    },
  ];

  return {
    name: derivedName,
    filesJson: JSON.stringify(files),
    screensJson: JSON.stringify(screens),
    messagesJson: JSON.stringify(messages),
    versionsJson: JSON.stringify(versions),
  };
}
