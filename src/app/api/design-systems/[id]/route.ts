import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

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
    const ds = await prisma.designSystem.findUnique({ where: { id } });
    if (!ds) {
      return NextResponse.json({ ok: false, error: 'Design system not found.' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      designSystem: {
        ...ds,
        colors: JSON.parse(ds.colorsJson || '{}'),
        typography: JSON.parse(ds.typographyJson || '{}'),
        components: JSON.parse(ds.componentsJson || '[]'),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to load design system.' }, { status: 500 });
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
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string') updateData.name = body.name.trim();
    if (typeof body.description === 'string') updateData.description = body.description;
    if (typeof body.radius === 'string') updateData.radius = body.radius;
    if (typeof body.customCss === 'string') updateData.customCss = body.customCss;
    if (body.colors) updateData.colorsJson = JSON.stringify(body.colors);
    if (body.typography) updateData.typographyJson = JSON.stringify(body.typography);
    if (body.components) updateData.componentsJson = JSON.stringify(body.components);
    if (typeof body.isDefault === 'boolean') {
      if (body.isDefault) {
        await prisma.designSystem.updateMany({
          where: { workspaceId: actor.workspaceId },
          data: { isDefault: false },
        });
      }
      updateData.isDefault = body.isDefault;
    }

    const updated = await prisma.designSystem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      designSystem: {
        ...updated,
        colors: JSON.parse(updated.colorsJson || '{}'),
        typography: JSON.parse(updated.typographyJson || '{}'),
        components: JSON.parse(updated.componentsJson || '[]'),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to update design system.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor || actor.role === 'Viewer') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }
    const { id } = await context.params;
    await prisma.designSystem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to delete design system.' }, { status: 500 });
  }
}
