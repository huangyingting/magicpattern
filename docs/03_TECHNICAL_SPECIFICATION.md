# Technical Specification — Magic Patterns Platform

**Version:** 2.0.0  
**Stack:** Next.js 16 (App Router), React 19, TypeScript, NextAuth v4, Prisma 7 (SQLite local / PostgreSQL prod), Tailwind CSS  

---

## 1. Complete Application Route Map

### 1.1 Public & Authentication Routes
| Route | Description | Access |
|---|---|---|
| `/` | Marketing landing page (when unauthenticated) or redirect/link to `/dashboard` | Public |
| `/pricing` | Public pricing & plan comparison (`Free`, `Starter`, `Business`, `Enterprise`) | Public |
| `/login` | Email/password & social sign-in with invite-only admission enforcement | Public |
| `/register` | Registration screen requiring a valid invitation token in `invitation-only` mode | Public |
| `/invite/[token]` | Single-use invitation inspection & account registration page | Public |
| `/p/[shareSlug]` | Published standalone live preview of a shared design project | Public (per share policy) |

### 1.2 Authenticated Workspace & Studio Routes
| Route | Description | Access |
|---|---|---|
| `/dashboard` | Recents hub, Meet MagicOS tour, Quick-create bar (`Design`, `Slide Deck`, `Design System`, `MagicOS`), tabs & filters | `Viewer+` |
| `/dashboard/files` | Workspace file manager (`All Files`, `Designs`, `Canvas`, `Templates`), folders (`New Folder`), filter & sort | `Viewer+` |
| `/dashboard/templates` | Workspace & curated starter templates gallery with 1-click `Use Template` | `Viewer+` |
| `/design-systems` | Design Systems catalog & 2-step `Create Design System` wizard | `Viewer+` |
| `/design-systems/[id]` | Interactive Design System token, CSS, typography, color & component studio | `Editor+` |
| `/c/[id]` | AI Design Editor (`Preview`, `Screens`, `Code`, `Visual Edit`, `Comments`, `Export`, `Share`, `Version History`) | `Viewer+` (edit requires `Editor+`) |
| `/os/new` | Creates a new MagicOS infinite context canvas and redirects to `/os/[id]` | `Editor+` |
| `/os/[id]` | MagicOS Infinite Context Canvas (`Pointer`, `Hand`, `Interact`, PRD/Repo/Image/Variant/MCP nodes, AI Transcript) | `Viewer+` |

### 1.3 Settings & Administration Routes
| Route | Description | Access |
|---|---|---|
| `/settings` | Redirects to `/settings/team` | `Viewer+` |
| `/settings/team` | Team member directory, role selector, CSV export, `Invite teammates` modal | `Viewer+` (mutations require `Admin`) |
| `/settings/subscription` | Current Plan, Credit Balance breakdown, Payment Method, Invoices, `Upgrade Plan` modal | `Viewer+` |
| `/settings/workspace` | Workspace logo, name, default sharing policy, and SSO configuration | `Viewer+` (mutations require `Admin`) |
| `/settings/usage-reports` | Timezone (`Local`/`UTC`), period (`1D`/`1M`/`3M`/`1Y`), KPIs, adoption chart, CSV export | `Viewer+` |
| `/settings/profile` | Activity heatmap, handle claim, first/last name, emails, LinkedIn/GitHub/Figma links | `Viewer+` |
| `/settings/integrations` | External LLM API keys (`OpenAI`, `Anthropic`) management | `Editor+` |
| `/settings/connectors` | Built-in (`Granola`, `Notion`, `Linear`, `Miro`, `Jira`, `Mobbin`) & custom MCP server connectors | `Editor+` |
| `/settings/skills` | `SKILL.md` packages (`Better Animation`, `Audit a11y`), CLI installer & custom skill editor | `Editor+` |
| `/settings/api-keys` | Workspace REST API & MCP keys creation and revocation | `Admin` / `Editor` |
| `/admin/invitations` | Dedicated Admin Console for single-use/expiring invitations, rotation, revocation, user roles & Audit Logs | `Admin` |

---

## 2. REST API Specification

### 2.1 Authentication, Invitations & Audit Logging
- `GET /api/auth/invitation?token=<opaqueToken>`
  - Hashes `token` with SHA-256, checks expiration, and returns `{ invitation: { id, email, maskedEmail, role, status, expiresAt, workspaceName } }`.
- `POST /api/auth/register`
  - Body: `{ email, password, name, token }`.
  - Validates `token` against `AccountInvitation` (`status === "PENDING"`, `expiresAt > now`, `normalizedEmail === email`), creates `User` + `PasswordCredential`, atomically marks invitation `ACCEPTED` (`tokenHash = null`, `activeForEmail = null`), assigns workspace membership, and writes `AuditLog` (`account.invitation.accept`).
- `GET /api/admin/invitations` (`Admin` only)
  - Returns `{ invitations, users, auditLogs, admissionMode }`.
- `POST /api/admin/invitations` (`Admin` only)
  - Body: `{ email, role, expiresInHours }`.
  - Creates a `PENDING` `AccountInvitation` (or comma-separated batch from `/settings/team`), logs `account.invitation.create` in `AuditLog`, and returns `{ invitation, token, inviteUrl }`.
- `POST /api/admin/invitations/[id]/rotate` (`Admin` only)
  - Generates a fresh cryptographic token, updates `tokenHash` and `expiresAt`, logs `account.invitation.rotate`, and returns `{ invitation, token, inviteUrl }`.
- `DELETE /api/admin/invitations/[id]` (`Admin` only)
  - Transitions invitation to `REVOKED`, clears `tokenHash` and `activeForEmail`, and logs `account.invitation.revoke`.
- `PATCH /api/admin/users/[id]` (`Admin` only)
  - Body: `{ role?, status? }`. Updates user role (`Admin` / `Editor` / `Viewer`) or status (`active` / `disabled`), increments `sessionVersion`, and logs `account.user.update` in `AuditLog`.
- `GET /api/admin/audit-logs` (`Admin` only)
  - Supports filtering by `action`, `actorEmail`, and limit; returns immutable `AuditLog` entries.

### 2.2 Workspace, Projects, AI Generation & Studio APIs
- `GET /api/projects`
  - Query params: `type` (`DESIGN` | `SLIDE_DECK` | `TEMPLATE`), `tab` (`recent` | `shared_me` | `shared_workspace` | `favorites`), `folderId`, `designSystemId`, `search`, `sort` (`updatedAt` | `createdAt` | `name`).
- `POST /api/projects`
  - Body: `{ name?, prompt, type: "DESIGN" | "SLIDE_DECK", designSystemId?, model?, command?, outlineJson?, folderId? }`.
  - Synthesizes a multi-file React/Tailwind component project (`filesJson`, `screensJson`, `messagesJson`, `versionsJson`), deducts 5 credits (recording a `CreditTransaction`), and returns the created `DesignProject`.
- `GET /api/projects/[id]` / `PATCH /api/projects/[id]` / `DELETE /api/projects/[id]`
  - Retrieves or mutates project metadata, files (`filesJson`), screens (`screensJson`), visual edits, comments (`commentsJson`), sharing settings (`visibility`, `sharePermission`, `isTemplate`), or restores a version snapshot.
- `POST /api/projects/[id]/chat`
  - Body: `{ prompt, command?, screenId?, selectedElement? }`.
  - Appends user prompt, executes AI transformation on the project's component code & preview (e.g., dark mode, chart/table addition, layout polish, debug fix, or multi-variant inspiration), creates a new version snapshot in `versionsJson`, and returns updated project state.
- `POST /api/projects/[id]/fork`
  - Clones an existing project or template into a new `DesignProject` owned by the current user.

### 2.3 Folders, Design Systems, MagicOS & Settings APIs
- `GET /api/folders` & `POST /api/folders` & `DELETE /api/folders/[id]`
- `GET /api/design-systems` & `POST /api/design-systems` & `GET/PATCH/DELETE /api/design-systems/[id]`
- `GET /api/canvases` & `POST /api/canvases` & `GET/PATCH/DELETE /api/canvases/[id]` (MagicOS `/os/[id]`)
- `GET/PATCH /api/settings` — Unified endpoint for Workspace settings, Profile, Subscription/Credits (`Get free credits` submission & Plan upgrades), Usage Reports telemetry, Integrations (`OpenAI`/`Anthropic` keys), MCP Connectors, `SKILL.md` Skills, and API Keys.
