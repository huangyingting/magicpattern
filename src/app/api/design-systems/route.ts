import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

const PRESET_CONFIGS: Record<
  string,
  {
    name: string;
    description: string;
    colors: Record<string, string>;
    typography: Record<string, string>;
    radius: string;
    customCss: string;
  }
> = {
  shadcn: {
    name: 'Base (Shadcn)',
    description: 'Clean neutral slate palette with Inter typography and accessible Radix primitives.',
    colors: {
      primary: '#0F172A',
      accent: '#4F46E5',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      border: '#E2E8F0',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      baseSize: '14px',
    },
    radius: '0.5rem',
    customCss: ':root {\n  --radius: 0.5rem;\n  --primary: #0F172A;\n  --accent: #4F46E5;\n}',
  },
  'modern-b2b': {
    name: 'Modern B2B SaaS',
    description: 'High-density enterprise data system with crisp indigo accents and tabular numeric alignment.',
    colors: {
      primary: '#4F46E5',
      accent: '#0EA5E9',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      border: '#CBD5E1',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      baseSize: '14px',
    },
    radius: '0.75rem',
    customCss: ':root {\n  --radius: 0.75rem;\n  --primary: #4F46E5;\n  --accent: #0EA5E9;\n}',
  },
  'playful-consumer': {
    name: 'Playful Consumer App',
    description: 'Vibrant consumer-friendly palette with warm gradients, pill radii, and expressive headings.',
    colors: {
      primary: '#EC4899',
      accent: '#8B5CF6',
      background: '#FFFDF9',
      surface: '#FFFFFF',
      border: '#F3E8FF',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#F43F5E',
    },
    typography: {
      headingFont: 'DM Sans',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      baseSize: '15px',
    },
    radius: '1.25rem',
    customCss: ':root {\n  --radius: 1.25rem;\n  --primary: #EC4899;\n  --accent: #8B5CF6;\n}',
  },
};

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const systems = await prisma.designSystem.findMany({
      where: { workspaceId: actor.workspaceId },
      include: {
        _count: { select: { projects: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      ok: true,
      designSystems: systems.map((ds) => ({
        id: ds.id,
        name: ds.name,
        description: ds.description,
        sourceType: ds.sourceType,
        sourceUrl: ds.sourceUrl,
        presetKey: ds.presetKey,
        isDefault: ds.isDefault,
        radius: ds.radius,
        customCss: ds.customCss,
        colors: JSON.parse(ds.colorsJson || '{}'),
        typography: JSON.parse(ds.typographyJson || '{}'),
        components: JSON.parse(ds.componentsJson || '[]'),
        projectCount: ds._count.projects,
        updatedAt: ds.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('List design systems error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load design systems.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const body = await request.json();
    const presetKey = String(body.presetKey || 'shadcn');
    const preset = PRESET_CONFIGS[presetKey] || PRESET_CONFIGS.shadcn;

    const name = String(body.name || preset.name).trim();
    const description = String(body.description || preset.description).trim();
    const sourceType = String(body.sourceType || 'preset');
    const sourceUrl = body.sourceUrl ? String(body.sourceUrl) : null;

    const created = await prisma.designSystem.create({
      data: {
        workspaceId: actor.workspaceId,
        createdById: actor.id,
        name,
        description,
        sourceType,
        sourceUrl,
        presetKey,
        isDefault: Boolean(body.isDefault),
        colorsJson: JSON.stringify(body.colors || preset.colors),
        typographyJson: JSON.stringify(body.typography || preset.typography),
        radius: body.radius ? String(body.radius) : preset.radius,
        customCss: body.customCss ? String(body.customCss) : preset.customCss,
        componentsJson: JSON.stringify([
          { name: 'Button', variants: ['Primary', 'Secondary', 'Ghost'], status: 'Ready' },
          { name: 'Card', variants: ['Default', 'Interactive'], status: 'Ready' },
          { name: 'Badge', variants: ['Positive', 'Neutral'], status: 'Ready' },
          { name: 'Modal', variants: ['Standard', 'Sheet'], status: 'Ready' },
        ]),
      },
    });

    return NextResponse.json({
      ok: true,
      designSystem: {
        ...created,
        colors: JSON.parse(created.colorsJson),
        typography: JSON.parse(created.typographyJson),
        components: JSON.parse(created.componentsJson),
      },
    });
  } catch (error) {
    console.error('Create design system error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create design system.' },
      { status: 500 }
    );
  }
}
