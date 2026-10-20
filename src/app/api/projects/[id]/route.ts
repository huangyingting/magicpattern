import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/audit';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const project = await prisma.designProject.findFirst({
      where: {
        OR: [{ id }, { shareSlug: id }],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        designSystem: true,
        folder: true,
      },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
    }

    const actor = await getAuthenticatedActor();
    if (!actor && project.publicPermission === 'NO_ACCESS') {
      return NextResponse.json(
        { ok: false, error: 'Public access is disabled for this project.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      project: {
        ...project,
        files: JSON.parse(project.filesJson || '{}'),
        screens: JSON.parse(project.screensJson || '[]'),
        messages: JSON.parse(project.messagesJson || '[]'),
        versions: JSON.parse(project.versionsJson || '[]'),
        comments: JSON.parse(project.commentsJson || '[]'),
        collaborators: JSON.parse(project.collaboratorsJson || '[]'),
      },
    });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load project.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json(
        { ok: false, error: 'Viewers cannot modify projects.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.designProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
    }

    const body = await request.json();

    // Handle Fork / Duplicate action
    if (body.action === 'fork') {
      const slugSuffix = Math.floor(100 + Math.random() * 900);
      const forked = await prisma.designProject.create({
        data: {
          shareSlug: `${existing.shareSlug}-fork-${slugSuffix}`,
          workspaceId: actor.workspaceId,
          folderId: existing.folderId,
          designSystemId: existing.designSystemId,
          createdById: actor.id,
          name: `${existing.name} (Fork)`,
          prompt: existing.prompt,
          type: existing.type,
          model: existing.model,
          status: 'READY',
          visibility: existing.visibility,
          workspaceAccess: existing.workspaceAccess,
          publicPermission: existing.publicPermission,
          isTemplate: false,
          isFavorite: false,
          showWatermark: existing.showWatermark,
          thumbnailAccent: existing.thumbnailAccent,
          filesJson: existing.filesJson,
          screensJson: existing.screensJson,
          messagesJson: existing.messagesJson,
          versionsJson: existing.versionsJson,
        },
      });
      await prisma.designProject.update({
        where: { id: existing.id },
        data: { forksCount: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, project: forked });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
    if (body.folderId !== undefined) updateData.folderId = body.folderId || null;
    if (body.designSystemId !== undefined) updateData.designSystemId = body.designSystemId || null;
    if (typeof body.model === 'string') updateData.model = body.model;
    if (typeof body.visibility === 'string') updateData.visibility = body.visibility;
    if (typeof body.workspaceAccess === 'string') updateData.workspaceAccess = body.workspaceAccess;
    if (typeof body.publicPermission === 'string') updateData.publicPermission = body.publicPermission;
    if (typeof body.isTemplate === 'boolean') updateData.isTemplate = body.isTemplate;
    if (typeof body.isFavorite === 'boolean') updateData.isFavorite = body.isFavorite;
    if (typeof body.showWatermark === 'boolean') updateData.showWatermark = body.showWatermark;
    if (body.files !== undefined) updateData.filesJson = JSON.stringify(body.files);
    if (body.screens !== undefined) updateData.screensJson = JSON.stringify(body.screens);
    if (body.collaborators !== undefined) updateData.collaboratorsJson = JSON.stringify(body.collaborators);

    const updated = await prisma.designProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      project: {
        ...updated,
        files: JSON.parse(updated.filesJson || '{}'),
        screens: JSON.parse(updated.screensJson || '[]'),
        messages: JSON.parse(updated.messagesJson || '[]'),
        versions: JSON.parse(updated.versionsJson || '[]'),
        comments: JSON.parse(updated.commentsJson || '[]'),
        collaborators: JSON.parse(updated.collaboratorsJson || '[]'),
      },
    });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update project.' }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.designProject.delete({ where: { id } });

    await recordAuditLog({
      workspaceId: actor.workspaceId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'project.delete',
      targetType: 'project',
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete project.' }, { status: 500 });
  }
}
