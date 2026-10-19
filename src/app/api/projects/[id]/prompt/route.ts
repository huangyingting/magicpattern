import { NextResponse } from 'next/server';
import { getAuthenticatedActor } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import {
  buildRevenueCardHtml,
  ChatMessage,
  ProjectScreen,
  ProjectVersion,
  VirtualFile,
} from '@/lib/ai-engine';

export async function POST(
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
        { ok: false, error: 'Viewers cannot run AI prompts.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const project = await prisma.designProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
    }

    const body = await request.json();

    const files: Record<string, VirtualFile> = JSON.parse(project.filesJson || '{}');
    const screens: ProjectScreen[] = JSON.parse(project.screensJson || '[]');
    const messages: ChatMessage[] = JSON.parse(project.messagesJson || '[]');
    const versions: ProjectVersion[] = JSON.parse(project.versionsJson || '[]');

    // Handle Version Restoration
    if (typeof body.restoreVersionNumber === 'number') {
      const targetVer = versions.find((v) => v.versionNumber === body.restoreVersionNumber);
      if (!targetVer) {
        return NextResponse.json({ ok: false, error: 'Version not found.' }, { status: 404 });
      }
      const restoredMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Restored project state to **Version ${targetVer.versionNumber}** (${targetVer.label}).`,
        versionNumber: targetVer.versionNumber,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, restoredMsg];
      const updated = await prisma.designProject.update({
        where: { id },
        data: {
          filesJson: targetVer.filesJson,
          screensJson: targetVer.screensJson,
          messagesJson: JSON.stringify(nextMessages),
        },
      });
      return NextResponse.json({
        ok: true,
        project: {
          ...updated,
          files: JSON.parse(updated.filesJson),
          screens: JSON.parse(updated.screensJson),
          messages: nextMessages,
          versions,
        },
      });
    }

    const promptText = String(body.prompt || '').trim();
    const command = body.command ? String(body.command) : undefined;
    if (!promptText && !command) {
      return NextResponse.json({ ok: false, error: 'Prompt is required.' }, { status: 400 });
    }

    const lower = `${command || ''} ${promptText}`.toLowerCase();
    const isDark = lower.includes('dark');
    const isComparison = lower.includes('compare') || lower.includes('previous period');
    const isBreakdown = lower.includes('breakdown') || lower.includes('plan tier') || lower.includes('polish');
    const isAddScreen = lower.includes('screen') || lower.includes('mobile');

    const nextVerNumber = versions.length + 1;

    // Update main screen HTML preview dynamically
    const updatedHtml = buildRevenueCardHtml({
      darkMode: isDark,
      showComparison: isComparison || true,
      showPlanBreakdown: isBreakdown,
      accentColor: project.thumbnailAccent,
      headlineTitle: project.name,
    });

    if (screens.length > 0) {
      screens[0] = {
        ...screens[0],
        htmlPreview: updatedHtml,
      };
    }

    if (isAddScreen && screens.length < 4) {
      screens.push({
        id: `screen_${screens.length + 1}`,
        name: `Mobile View (${screens.length + 1})`,
        route: `/mobile-${screens.length + 1}`,
        width: 390,
        height: 844,
        x: screens.length * 1340,
        y: 0,
        device: 'mobile',
        htmlPreview: updatedHtml,
      });
    }

    // Update virtual file tree
    const componentPath = Object.keys(files).find((k) => k.startsWith('components/')) || 'components/RevenueMetricCard.tsx';
    files[componentPath] = {
      path: componentPath,
      language: 'tsx',
      content: `${files[componentPath]?.content || ''}\n// Updated in v${nextVerNumber}: ${promptText || command}\n`,
    };

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: 'user',
      content: command ? `/${command} ${promptText}`.trim() : promptText,
      command,
      createdAt: new Date().toISOString(),
    };

    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_a`,
      role: 'assistant',
      content: command
        ? `Executed **/${command}** workflow and updated **${project.name}** (Version ${nextVerNumber}):`
        : `Updated **${project.name}** based on your prompt (Version ${nextVerNumber}):`,
      thoughtSeconds: 4,
      toolsUsed: 1,
      edits: [
        { file: componentPath, action: 'Updated', additions: 28 },
        { file: 'App.tsx', action: 'Updated', additions: 6 },
      ],
      bullets: [
        isDark
          ? 'Applied high-contrast dark slate theme (#0B0F19 surface) with accessible foreground tokens'
          : 'Refined layout spacing, interactive chart states, and typography hierarchy',
        isBreakdown
          ? 'Added plan-tier revenue breakdown grid (Starter 22%, Business 50%, Enterprise 28%)'
          : 'Added dashed previous-period comparison trendline for immediate MoM benchmarking',
        isAddScreen
          ? 'Added responsive Mobile View (390×844) frame to the multi-screen canvas'
          : 'Synchronized component state with live interactive preview',
      ],
      suggestions: [
        'Add dark mode variant',
        'Add breakdown by plan tier',
        'Add mobile screen',
      ],
      versionNumber: nextVerNumber,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg, assistantMsg];
    const nextVersions: ProjectVersion[] = [
      ...versions,
      {
        versionNumber: nextVerNumber,
        label: command ? `/${command}: ${promptText.slice(0, 36)}` : promptText.slice(0, 44),
        prompt: promptText || `/${command}`,
        createdAt: new Date().toISOString(),
        filesJson: JSON.stringify(files),
        screensJson: JSON.stringify(screens),
      },
    ];

    const updated = await prisma.designProject.update({
      where: { id },
      data: {
        filesJson: JSON.stringify(files),
        screensJson: JSON.stringify(screens),
        messagesJson: JSON.stringify(nextMessages),
        versionsJson: JSON.stringify(nextVersions),
      },
    });

    await prisma.workspace.update({
      where: { id: actor.workspaceId },
      data: { freeCreditsUsed: { increment: 1 } },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      project: {
        ...updated,
        files,
        screens,
        messages: nextMessages,
        versions: nextVersions,
      },
    });
  } catch (error) {
    console.error('Project prompt error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to process prompt.' }, { status: 500 });
  }
}
