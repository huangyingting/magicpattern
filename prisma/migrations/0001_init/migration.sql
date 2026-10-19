-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT NOT NULL DEFAULT 'Joshuah Powlowski',
    "firstName" TEXT NOT NULL DEFAULT 'Joshuah',
    "lastName" TEXT NOT NULL DEFAULT 'Powlowski',
    "handle" TEXT,
    "billingEmail" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Admin',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "passwordHash" TEXT,
    "streakDays" INTEGER NOT NULL DEFAULT 4,
    "tokensUsed" INTEGER NOT NULL DEFAULT 12840,
    "connectedAccountsJson" TEXT NOT NULL DEFAULT '{"linkedin":false,"github":true,"figma":true}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

CREATE TABLE "PasswordCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetTokenHash" TEXT,
    "resetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PasswordCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PasswordCredential_userId_key" ON "PasswordCredential"("userId");

CREATE TABLE "AccountInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "activeForEmail" TEXT,
    "tokenHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Editor',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "workspaceId" TEXT,
    "invitedById" TEXT,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountInvitation_activeForEmail_key" ON "AccountInvitation"("activeForEmail");
CREATE UNIQUE INDEX "AccountInvitation_tokenHash_key" ON "AccountInvitation"("tokenHash");

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL DEFAULT 'system',
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT 'system',
    "targetId" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
