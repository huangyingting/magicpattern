import { prisma } from './prisma';

export interface AuditLogInput {
  workspaceId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function recordAuditLog(input: AuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId || null,
        actorId: input.actorId || null,
        actorEmail: input.actorEmail || 'system',
        action: input.action,
        targetType: input.targetType || 'system',
        targetId: input.targetId || null,
        metadataJson: JSON.stringify(input.metadata || {}),
        ipAddress: input.ipAddress || null,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err);
    return null;
  }
}
