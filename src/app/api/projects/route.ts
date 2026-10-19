import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { synthesizeProjectArtifacts } from '@/lib/ai-engine';
import { recordAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const type = searchParams.get('type') || ''; // DESIGN | SLIDE_DECK
    const folderId = searchParams.get('folderId') || '';
    const visibility = searchParams.get('visibility') || ''; // WORKSPACE | PRIVATE | PUBLIC
    const createdBy = searchParams.get('createdBy') || ''; // me | all
    const favoritesOnly = searchParams.get('favorites') === 'true';
    const templatesOnly = searchParams.get('templates') === 'true';
    const sortBy = searchParams.get('sortBy') || 'updatedAt'; // updatedAt | createdAt | name

    const orderBy =
      sortBy === 'createdAt'
        ? { createdAt: 'desc' as const }
        : sortBy === 'name'
        ? { name: 'asc' as const }
        : { updatedAt: 'desc' as const };

    const projects = await prisma.designProject.findMany({
      where: {
        workspaceId: actor.workspaceId,
        ...(type ? { type } : {}),
        ...(folderId ? { folderId } : {}),
        ...(visibility ? { visibility } : {}),
        ...(createdBy === 'me' ? { createdById: actor.id } : {}),
        ...(favoritesOnly ? { isFavorite: true } : {}),
        ...(templatesOnly ? { isTemplate: true } : {}),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        designSystem: {
          select: { id: true, name: true },
        },
        folder: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy,
    });

    const filtered = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.prompt.toLowerCase().includes(q) ||
            (p.createdBy?.name || '').toLowerCase().includes(q)
        )
      : projects;

    return NextResponse.json({
      ok: true,
      projects: filtered.map((p) => ({
        id: p.id,
        shareSlug: p.shareSlug,
        name: p.name,
        prompt: p.prompt,
        type: p.type,
        model: p.model,
        status: p.status,
        visibility: p.visibility,
        workspaceAccess: p.workspaceAccess,
        publicPermission: p.publicPermission,
        isTemplate: p.isTemplate,
        isFavorite: p.isFavorite,
        showWatermark: p.showWatermark,
        thumbnailAccent: p.thumbnailAccent,
        folderId: p.folderId,
        folder: p.folder,
        designSystemId: p.designSystemId,
        designSystem: p.designSystem,
        createdBy: p.createdBy,
        viewsCount: p.viewsCount,
        forksCount: p.forksCount,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('List projects error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load projects.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json(
        { ok: false, error: 'Viewers cannot create new designs.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const prompt = String(body.prompt || 'Create a clean SaaS analytics metric card with revenue chart');
    const type = body.type === 'SLIDE_DECK' ? 'SLIDE_DECK' : 'DESIGN';
    const model = String(body.model || 'Auto');
    const designSystemId = body.designSystemId ? String(body.designSystemId) : 'ds_shadcn_base';
    const folderId = body.folderId ? String(body.folderId) : null;

    const ds = await prisma.designSystem.findUnique({ where: { id: designSystemId } });
    let accentColor = '#4F46E5';
    if (ds?.colorsJson) {
      try {
        const parsed = JSON.parse(ds.colorsJson);
        accentColor = parsed.accent || parsed.primary || '#4F46E5';
      } catch {
        // default
      }
    }

    const artifacts = synthesizeProjectArtifacts({
      name: body.name ? String(body.name) : undefined,
      prompt,
      type,
      designSystemName: ds?.name || 'Base (Shadcn)',
      accentColor,
      outlineSlides: Array.isArray(body.outlineSlides) ? body.outlineSlides : undefined,
    });

    const slugSuffix = Math.floor(100 + Math.random() * 900);
    const shareSlug = `project-${artifacts.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${slugSuffix}`;

    const created = await prisma.designProject.create({
      data: {
        shareSlug,
        workspaceId: actor.workspaceId,
        folderId,
        designSystemId: ds ? ds.id : null,
        createdById: actor.id,
        name: artifacts.name,
        prompt,
        type,
        model,
        status: 'READY',
        visibility: 'WORKSPACE',
        workspaceAccess: 'Editor',
        publicPermission: 'PREVIEW_ONLY',
        isTemplate: Boolean(body.isTemplate),
        isFavorite: false,
        showWatermark: true,
        thumbnailAccent: accentColor,
        filesJson: artifacts.filesJson,
        screensJson: artifacts.screensJson,
        messagesJson: artifacts.messagesJson,
        versionsJson: artifacts.versionsJson,
      },
    });

    // Increment workspace free credits used & user token telemetry
    await prisma.workspace.update({
      where: { id: actor.workspaceId },
      data: { freeCreditsUsed: { increment: 1 } },
    }).catch(() => null);

    await prisma.user.update({
      where: { id: actor.id },
      data: { tokensUsed: { increment: 2450 } },
    }).catch(() => null);

    await recordAuditLog({
      workspaceId: actor.workspaceId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project.create',
      targetType: 'project',
      targetId: created.id,
      metadata: {
        name: created.name,
        type: created.type,
        model: created.model,
      },
    });

    return NextResponse.json({
      ok: true,
      project: created,
    });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create project.' }, { status: 500 });
  }
}
