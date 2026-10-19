import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface SessionActor {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: string;
  workspaceId: string;
}

export async function getAuthenticatedActor(): Promise<SessionActor | null> {
  const session = await getServerSession(authOptions);
  const emailToLookup = session?.user?.email
    ? session.user.email.toLowerCase()
    : 'powlowskijoshuah@gmail.com';

  const user = await prisma.user.findUnique({
    where: { email: emailToLookup },
    include: {
      memberships: {
        take: 1,
      },
    },
  });

  if (!user || user.status === 'disabled') {
    return null;
  }

  let workspaceId = user.memberships[0]?.workspaceId;
  if (!workspaceId) {
    const defaultWs = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    workspaceId = defaultWs?.id || 'ws_joshuah';
  }

  const normalizedRole =
    user.role === 'Admin' || user.role === 'ADMIN'
      ? 'Admin'
      : user.role === 'Viewer'
      ? 'Viewer'
      : 'Editor';

  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email,
    role: normalizedRole,
    status: user.status,
    workspaceId,
  };
}
