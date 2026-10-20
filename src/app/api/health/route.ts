import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accountAdmissionMode } from '@/lib/account-admission';
import { getAiProviderStatus } from '@/lib/production-engine/ai-provider';

export async function GET() {
  try {
    const [workspaceCount, userCount] = await Promise.all([
      prisma.workspace.count(),
      prisma.user.count(),
    ]);
    const aiStatus = getAiProviderStatus();

    return NextResponse.json({
      ok: true,
      status: 'healthy',
      database: 'connected',
      workspaceCount,
      userCount,
      admissionMode: accountAdmissionMode(),
      aiProvider: aiStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Healthcheck error:', error);
    return NextResponse.json(
      {
        ok: false,
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
