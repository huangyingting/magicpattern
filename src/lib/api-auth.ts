import { getServerSession } from 'next-auth';
import { cookies, headers } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashOpaqueToken } from '@/lib/account-admission/tokens';
import { SESSION_COOKIES } from '@/lib/account-admission/session';

export interface SessionActor {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: string;
  workspaceId: string;
  authMethod?: 'session' | 'api_key';
}

function normalizeRole(role?: string | null): 'Admin' | 'Editor' | 'Viewer' {
  if (role === 'Admin' || role === 'ADMIN') return 'Admin';
  if (role === 'Viewer' || role === 'VIEWER') return 'Viewer';
  return 'Editor';
}

export async function getAuthenticatedActor(): Promise<SessionActor | null> {
  // 1. Check Authorization: Bearer <mp_live_...> Workspace API Key
  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const rawKey = authHeader.slice(7).trim();
      if (rawKey) {
        const keyHash = hashOpaqueToken(rawKey);
        const apiKey = await prisma.workspaceApiKey.findFirst({
          where: { keyHash },
        });
        const integrationKey = !apiKey
          ? await prisma.workspaceIntegrationKey.findFirst({
              where: { keyHash },
            })
          : null;
        const matchedKey = apiKey || integrationKey;
        if (matchedKey) {
          if (apiKey) {
            await prisma.workspaceApiKey.update({
              where: { id: apiKey.id },
              data: { lastUsedAt: new Date() },
            });
          }
          const keyOwner = matchedKey.createdById
            ? await prisma.user.findUnique({ where: { id: matchedKey.createdById } })
            : await prisma.user.findFirst({
                where: { status: 'active' },
                orderBy: { createdAt: 'asc' },
              });
          if (keyOwner && keyOwner.status === 'active') {
            return {
              id: keyOwner.id,
              email: keyOwner.email,
              name: keyOwner.name || keyOwner.email,
              role: normalizeRole(keyOwner.role),
              status: keyOwner.status,
              workspaceId: matchedKey.workspaceId,
              authMethod: 'api_key',
            };
          }
        }
      }
      return null;
    }
  } catch {
    // Next headers unavailable outside request context
  }

  // 2. Check NextAuth JWT Session
  let emailToLookup: string | null = null;
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    emailToLookup = session.user.email.toLowerCase();
  }

  // 3. Fallback to Database Session Cookie if present
  if (!emailToLookup) {
    try {
      const cookieStore = await cookies();
      for (const cookieName of SESSION_COOKIES) {
        const token = cookieStore.get(cookieName)?.value;
        if (token) {
          const dbSession = await prisma.session.findUnique({
            where: { sessionToken: token },
            include: { user: true },
          });
          if (dbSession && dbSession.expires > new Date() && dbSession.user) {
            emailToLookup = dbSession.user.email.toLowerCase();
            break;
          }
        }
      }
    } catch {
      // Ignore cookie errors outside request context
    }
  }

  if (!emailToLookup) {
    return null;
  }

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

  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email,
    role: normalizeRole(user.role),
    status: user.status,
    workspaceId,
    authMethod: 'session',
  };
}
