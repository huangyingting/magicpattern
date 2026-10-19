import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { SpatialComment } from '@/lib/ai-engine';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAuthenticatedActor();
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const { id } = await context.params;
    const project = await prisma.designProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
    }

    const body = await request.json();
    const comments: SpatialComment[] = JSON.parse(project.commentsJson || '[]');

    if (body.commentId && body.replyText) {
      const target = comments.find((c) => c.id === body.commentId);
      if (target) {
        target.replies = target.replies || [];
        target.replies.push({
          id: `rep_${Date.now()}`,
          authorName: actor.name,
          content: String(body.replyText).trim(),
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      const newComment: SpatialComment = {
        id: `cmt_${Date.now()}`,
        screenId: String(body.screenId || 'screen_main'),
        x: Number(body.x ?? 50),
        y: Number(body.y ?? 40),
        authorName: actor.name,
        authorEmail: actor.email,
        content: String(body.content || '').trim(),
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        replies: [],
      };
      comments.push(newComment);
    }

    await prisma.designProject.update({
      where: { id },
      data: { commentsJson: JSON.stringify(comments) },
    });

    return NextResponse.json({ ok: true, comments });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to add comment.' }, { status: 500 });
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

    const { id } = await context.params;
    const project = await prisma.designProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
    }

    const body = await request.json();
    const comments: SpatialComment[] = JSON.parse(project.commentsJson || '[]');
    const target = comments.find((c) => c.id === body.commentId);
    if (target && body.status) {
      target.status = body.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN';
    }

    await prisma.designProject.update({
      where: { id },
      data: { commentsJson: JSON.stringify(comments) },
    });

    return NextResponse.json({ ok: true, comments });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update comment.' }, { status: 500 });
  }
}
