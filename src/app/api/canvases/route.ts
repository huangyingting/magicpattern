import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const canvases = await prisma.canvasProject.findMany({
      where: { workspaceId: actor.workspaceId },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      ok: true,
      canvases: canvases.map((c) => ({
        id: c.id,
        name: c.name,
        zoom: c.zoom,
        panX: c.panX,
        panY: c.panY,
        nodes: JSON.parse(c.nodesJson || '[]'),
        edges: JSON.parse(c.edgesJson || '[]'),
        transcript: JSON.parse(c.transcriptJson || '[]'),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to load canvases.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor || actor.role === 'Viewer') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || 'Untitled MagicOS Canvas').trim();

    const defaultNodes = [
      {
        id: 'node_prd',
        type: 'prd',
        title: 'Product Requirements (PRD)',
        subtitle: 'Pasted ⌘V',
        x: 80,
        y: 120,
        content: String(
          body.prompt ||
            'Cut checkout drop-off on mobile by a third with express Apple Pay and inline validation.'
        ),
      },
      {
        id: 'node_repo',
        type: 'github_repo',
        title: 'acme/web',
        subtitle: 'main • Connected',
        status: 'Connected',
        x: 80,
        y: 310,
        content: 'Pulling live Tailwind design tokens and React primitives from GitHub.',
      },
      {
        id: 'node_var_a',
        type: 'ui_variant',
        title: 'Variant A · Two Column',
        subtitle: 'Interactive Prototype',
        x: 450,
        y: 120,
        projectId: 'tvajgfewuihg5kqchnvgxv',
        content: 'Desktop & mobile responsive split layout.',
      },
      {
        id: 'node_var_b',
        type: 'ui_variant',
        title: 'Variant B · Express Sheet',
        subtitle: 'Interactive Prototype',
        x: 450,
        y: 310,
        projectId: 'prj_checkout_template',
        content: 'Mobile-first 1-click express checkout drawer.',
      },
      {
        id: 'node_mcp',
        type: 'mcp_agent',
        title: 'Coding Agents (MCP)',
        subtitle: 'Claude Code • Cursor • Codex',
        status: 'Connected',
        x: 820,
        y: 210,
        content: 'Ready for live MCP handoff.',
      },
    ];

    const defaultEdges = [
      { from: 'node_prd', to: 'node_var_a' },
      { from: 'node_repo', to: 'node_var_b' },
      { from: 'node_var_a', to: 'node_mcp' },
      { from: 'node_var_b', to: 'node_mcp' },
    ];

    const created = await prisma.canvasProject.create({
      data: {
        workspaceId: actor.workspaceId,
        createdById: actor.id,
        name,
        nodesJson: JSON.stringify(defaultNodes),
        edgesJson: JSON.stringify(defaultEdges),
        transcriptJson: JSON.stringify([
          {
            id: `tr_${Date.now()}`,
            role: 'assistant',
            text: `Initialized MagicOS canvas "${name}" with PRD context, GitHub repo connection, UI variants, and MCP agent bridge.`,
            createdAt: new Date().toISOString(),
          },
        ]),
      },
    });

    return NextResponse.json({
      ok: true,
      canvas: {
        ...created,
        nodes: defaultNodes,
        edges: defaultEdges,
        transcript: JSON.parse(created.transcriptJson),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to create canvas.' }, { status: 500 });
  }
}
