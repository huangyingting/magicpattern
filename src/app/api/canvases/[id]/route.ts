import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';
import { callLlmCompletion } from '@/lib/production-engine/ai-provider';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    const { id } = await context.params;
    const canvas = await prisma.canvasProject.findUnique({ where: { id } });
    if (!canvas) {
      return NextResponse.json({ ok: false, error: 'Canvas not found.' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      canvas: {
        ...canvas,
        nodes: JSON.parse(canvas.nodesJson || '[]'),
        edges: JSON.parse(canvas.edgesJson || '[]'),
        transcript: JSON.parse(canvas.transcriptJson || '[]'),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to load canvas.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor || actor.role === 'Viewer') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.canvasProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Canvas not found.' }, { status: 404 });
    }

    const body = await request.json();
    const nodes = body.nodes ?? JSON.parse(existing.nodesJson || '[]');
    const edges = body.edges ?? JSON.parse(existing.edgesJson || '[]');
    const transcript = body.transcript ?? JSON.parse(existing.transcriptJson || '[]');

    // If user submitted a prompt in the MagicOS dock, synthesize a new UI variant node & edge
    if (typeof body.prompt === 'string' && body.prompt.trim()) {
      const promptText = body.prompt.trim();
      const newNodeId = `node_var_${Date.now()}`;
      const newY = 90 + (nodes.filter((n: { type: string }) => n.type === 'ui_variant').length * 175);
      const llmSummary = await callLlmCompletion(
        'You are MagicOS spatial canvas architect. Summarize in 1 concise sentence the UI variant synthesized on the canvas.',
        `Canvas: ${existing.name}. Prompt: ${promptText}`,
        3500
      );
      nodes.push({
        id: newNodeId,
        type: 'ui_variant',
        title: `Variant · ${promptText.slice(0, 26)}`,
        subtitle: 'Synthesized on MagicOS Canvas',
        x: 440,
        y: newY,
        projectId: 'tvajgfewuihg5kqchnvgxv',
        content: promptText,
      });
      edges.push({ from: 'node_prd', to: newNodeId });
      edges.push({ from: newNodeId, to: 'node_mcp' });
      transcript.push(
        {
          id: `tr_${Date.now()}_u`,
          role: 'user',
          text: promptText,
          createdAt: new Date().toISOString(),
        },
        {
          id: `tr_${Date.now()}_a`,
          role: 'assistant',
          text: llmSummary.ok
            ? llmSummary.text
            : `Synthesized new interactive UI variant "${promptText.slice(0, 32)}" on the canvas and wired it to your MCP coding agents.`,
          createdAt: new Date().toISOString(),
        }
      );

      await prisma.creditTransaction
        .create({
          data: {
            workspaceId: actor.workspaceId,
            actorEmail: actor.email,
            actionType: 'magicos.variant.synthesize',
            creditsDelta: -1,
            description: `MagicOS variant synthesis: ${promptText.slice(0, 48)}`,
          },
        })
        .catch(() => null);
    }

    const updated = await prisma.canvasProject.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' ? body.name : existing.name,
        zoom: typeof body.zoom === 'number' ? body.zoom : existing.zoom,
        panX: typeof body.panX === 'number' ? body.panX : existing.panX,
        panY: typeof body.panY === 'number' ? body.panY : existing.panY,
        nodesJson: JSON.stringify(nodes),
        edgesJson: JSON.stringify(edges),
        transcriptJson: JSON.stringify(transcript),
      },
    });

    return NextResponse.json({
      ok: true,
      canvas: {
        ...updated,
        nodes,
        edges,
        transcript,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to update canvas.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      await recordAuditLog({
        workspaceId: actor.workspaceId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'rbac.denied',
        targetType: 'canvas',
        metadata: { role: actor.role },
      });
      return NextResponse.json(
        { ok: false, error: 'Viewers cannot delete MagicOS canvases.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    await prisma.canvasProject.delete({ where: { id } });

    await recordAuditLog({
      workspaceId: actor.workspaceId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'canvas.delete',
      targetType: 'canvas',
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Failed to delete canvas.' }, { status: 500 });
  }
}
