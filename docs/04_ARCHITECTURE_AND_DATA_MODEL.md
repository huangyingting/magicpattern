# System Architecture & Data Model — Magic Patterns Platform

**Version:** 2.0.0  

---

## 1. High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                   Next.js 16 App Router (React 19 + TS)                    │
├──────────────────────┬──────────────────────────┬──────────────────────────┤
│  Public & Auth UI    │  Workspace & Settings UI │  Interactive Studios     │
│  • / (Landing)       │  • /dashboard (Recents)  │  • /c/[id] Design Editor │
│  • /pricing          │  • /dashboard/files      │    - Preview + Controls  │
│  • /login, /register │  • /dashboard/templates  │    - Visual Edit Bridge  │
│  • /invite/[token]   │  • /design-systems/[id]  │    - Spatial Comments    │
│  • /p/[shareSlug]    │  • /settings/* (9 tabs)  │    - Screens Canvas      │
│                      │  • /admin/invitations    │    - Multi-File Code IDE │
│                      │                          │  • /os/[id] MagicOS      │
├──────────────────────┴──────────────────────────┴──────────────────────────┤
│                  Next.js Route Handlers (src/app/api/**)                   │
│  • NextAuth + Account Admission Engine (src/lib/account-admission/*)       │
│  • AI UI Synthesis & Multi-File Component Engine (src/lib/ai-engine.ts)    │
│  • RBAC Guard & Immutable Audit Logger (src/lib/audit.ts)                  │
├────────────────────────────────────────────────────────────────────────────┤
│                  Prisma 7 ORM + Runtime Driver Adapter                     │
│  • Local Dev: @prisma/adapter-better-sqlite3 (prisma/schema.prisma)        │
│  • Production: @prisma/adapter-pg (prisma/schema.postgres.prisma)          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Entity Relationships

### 2.1 Identity, Admission & Security Models
- **`User`**:
  - `id`, `email` (`@unique`), `name`, `firstName`, `lastName`, `handle` (`@unique`), `billingEmail`, `image`, `role` (`"Admin" | "Editor" | "Viewer"`), `status` (`"active" | "disabled"`), `sessionVersion` (`Int`), `streakDays`, `tokensUsed`, `connectedAccountsJson` (`{ linkedin, github, figma }`), `createdAt`, `updatedAt`.
- **`Account`**, **`Session`**, **`VerificationToken`**:
  - Standard NextAuth adapter models.
- **`PasswordCredential`**:
  - `id`, `userId` (`@unique`), `passwordHash` (scrypt/bcrypt), `passwordChangedAt`, `resetTokenHash`, `resetExpiresAt`.
- **`AccountInvitation`**:
  - `id`, `email`, `normalizedEmail`, `activeForEmail` (`@unique` — enforces at most one active pending invite per email), `tokenHash` (`@unique` — SHA-256 of opaque token; nulled on terminal transition), `role` (`"Admin" | "Editor" | "Viewer"`), `status` (`"PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"`), `workspaceId`, `invitedById`, `acceptedById`, `expiresAt`, `acceptedAt`, `revokedAt`, `createdAt`, `updatedAt`.
- **`AccountEmailOutbox`**:
  - Transactional email queue for invitation links.
- **`AuditLog`**:
  - `id`, `workspaceId`, `actorId`, `actorEmail`, `action` (e.g. `system.admin.bootstrap`, `account.invitation.create`, `account.invitation.rotate`, `account.invitation.revoke`, `account.invitation.accept`, `account.user.role_change`, `project.create`, `project.export`, `api_key.create`), `targetType`, `targetId`, `metadataJson`, `ipAddress`, `createdAt`.

### 2.2 Workspace, Billing, Integrations, Connectors & Skills Models
- **`Workspace`**:
  - `id`, `name`, `slug` (`@unique`), `logoUrl`, `planTier` (`"FREE" | "STARTER" | "BUSINESS" | "ENTERPRISE"`), `billingInterval` (`"monthly" | "annual"`), `shareNewDesignsWithWorkspace` (`Boolean`), `ssoEnabled` (`Boolean`), `ssoDomain`, `rolledOverCredits`, `monthlyCreditsUsed`, `monthlyCreditsQuota`, `freeCreditsUsed`, `freeCreditsQuota`, `giftedCredits`, `purchasedCredits`, `paymentMethodJson`, `invoicesJson`, `createdAt`, `updatedAt`.
- **`WorkspaceMember`**:
  - `id`, `workspaceId`, `userId`, `role` (`"Admin" | "Editor" | "Viewer"`), `lastActiveAt`, `joinedAt`.
- **`Folder`**:
  - `id`, `workspaceId`, `name`, `color`, `createdById`, `createdAt`.
- **`DesignSystem`**:
  - `id`, `workspaceId`, `name`, `description`, `logoUrl`, `sourceType` (`"preset" | "github" | "figma" | "website" | "local"`), `sourceUrl`, `presetKey` (`"shadcn" | "modern-b2b" | "playful-consumer"`), `colorsJson`, `typographyJson`, `radius`, `customCss`, `componentsJson`, `isDefault`, `createdById`, `createdAt`, `updatedAt`.
- **`DesignProject`**:
  - `id`, `shareSlug` (`@unique`), `workspaceId`, `folderId`, `designSystemId`, `createdById`, `name`, `prompt`, `type` (`"DESIGN" | "SLIDE_DECK"`), `model` (`"Auto" | "Claude 3.7 Sonnet" | "GPT-4o" | "Gemini Pro"`), `status` (`"READY" | "ARCHIVED"`), `visibility` (`"WORKSPACE" | "PUBLIC" | "PRIVATE"`), `publicPermission` (`"PREVIEW_ONLY" | "CODE_AND_FORK" | "NO_ACCESS"`), `isTemplate` (`Boolean`), `isFavorite` (`Boolean`), `showWatermark` (`Boolean`), `thumbnailCategory`, `filesJson`, `screensJson`, `messagesJson`, `versionsJson`, `commentsJson`, `collaboratorsJson`, `viewsCount`, `forksCount`, `createdAt`, `updatedAt`.
- **`CanvasProject`** (MagicOS `/os/[id]`):
  - `id`, `workspaceId`, `createdById`, `name`, `nodesJson`, `edgesJson`, `transcriptJson`, `zoom`, `panX`, `panY`, `createdAt`, `updatedAt`.
- **`WorkspaceIntegrationKey`**:
  - `id`, `workspaceId`, `provider` (`"OpenAI" | "Anthropic"`), `name`, `maskedKey`, `keyHash`, `createdById`, `createdAt`.
- **`McpConnector`**:
  - `id`, `workspaceId`, `provider` (`"Granola" | "Notion" | "Linear" | "Miro" | "Jira" | "Mobbin" | "Custom"`), `name`, `description`, `serverUrl`, `authType` (`"OAuth" | "Bearer"`), `status` (`"CONNECTED" | "DISCONNECTED"`), `isCustom` (`Boolean`), `createdAt`.
- **`AiSkill`**:
  - `id`, `workspaceId`, `slug`, `name`, `description`, `commandRepo`, `skillMarkdown`, `isFeatured` (`Boolean`), `isEnabled` (`Boolean`), `createdAt`.
- **`WorkspaceApiKey`**:
  - `id`, `workspaceId`, `name`, `maskedKey`, `keyHash`, `lastUsedAt`, `createdById`, `createdAt`.
- **`CreditTransaction`**:
  - `id`, `workspaceId`, `actorEmail`, `actionType`, `creditsDelta`, `description`, `createdAt`.
