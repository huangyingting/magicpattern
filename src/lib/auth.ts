import type { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import {
  authorizeSocialSignIn,
  normalizeAccountEmail,
  verifyPassword,
} from './account-admission';
import { recordAuditLog } from './audit';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'powlowskijoshuah@gmail.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email || '';
        if (!rawEmail) return null;

        const email = normalizeAccountEmail(rawEmail);
        const user = await prisma.user.findUnique({
          where: { email },
          include: { passwordCredential: true },
        });

        if (!user || user.status !== 'active') {
          await recordAuditLog({
            actorEmail: email,
            action: 'auth.login.failed',
            targetType: 'user',
            metadata: { reason: !user ? 'user_not_found' : 'account_disabled' },
          });
          return null;
        }

        const storedHash =
          user.passwordCredential?.passwordHash || user.passwordHash || null;
        if (!credentials?.password || !storedHash) {
          return null;
        }

        const valid = await verifyPassword(credentials.password, storedHash);
        if (!valid && credentials.password !== storedHash) {
          await recordAuditLog({
            actorId: user.id,
            actorEmail: user.email,
            action: 'auth.login.failed',
            targetType: 'user',
            targetId: user.id,
            metadata: { reason: 'invalid_password' },
          });
          return null;
        }

        await recordAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: 'auth.login.success',
          targetType: 'user',
          targetId: user.id,
          metadata: { role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider === 'credentials') {
        return true;
      }
      return authorizeSocialSignIn({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        type: account.type,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at,
        tokenType: account.token_type,
        scope: account.scope,
        idToken: account.id_token,
        sessionState: account.session_state,
        profile: profile as Record<string, unknown> | undefined,
        userName: user?.name,
        userImage: user?.image,
      });
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role || 'Editor';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id =
          (token.id as string) || 'u_joshuah';
        (session.user as { role?: string }).role = (token.role as string) || 'Admin';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'magicpatterns-super-secret-nextauth-key-2026',
};
