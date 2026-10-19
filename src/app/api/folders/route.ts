import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const folders = await prisma.folder.findMany({
      where: { workspaceId: actor.workspaceId },
      include: {
        _count: { select: { projects: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      ok: true,
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        projectCount: f._count.projects,
        createdAt: f.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('List folders error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load folders.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json({ ok: false, error: 'Viewers cannot create folders.' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: 'Folder name is required.' }, { status: 400 });
    }

    const folder = await prisma.folder.create({
      data: {
        workspaceId: actor.workspaceId,
        name,
        color: body.color ? String(body.color) : '#4F46E5',
        createdById: actor.id,
      },
    });

    return NextResponse.json({ ok: true, folder });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create folder.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }
    if (actor.role === 'Viewer') {
      return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Folder id required.' }, { status: 400 });
    }

    await prisma.folder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete folder.' }, { status: 500 });
  }
}
