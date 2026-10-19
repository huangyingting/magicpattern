# Architecture Decision Records (ADRs) — Magic Patterns Platform

**Status:** Approved  
**Date:** October 2026  

---

## ADR-001: Next.js 16 App Router Full-Stack Monolith

### Context
Magic Patterns requires marketing pages (`/`, `/pricing`), authentication & invitation acceptance flows (`/login`, `/register`, `/invite/[token]`), a multi-route workspace dashboard (`/dashboard`, `/dashboard/files`, `/dashboard/templates`, `/design-systems`, `/settings/*`, `/admin/invitations`), and real-time interactive studio experiences (`/c/[id]` Design Editor and `/os/[id]` MagicOS Canvas) backed by transactional REST APIs.

### Decision
Use **Next.js 16** (App Router) with React 19 and TypeScript in a unified full-stack repository. Server Components and Route Handlers (`src/app/api/**`) co-locate data access with UI routes, eliminating CORS overhead and keeping types synchronized end-to-end.

### Consequences
- Single build and deployment artifact (`npm run build && npm start`).
- Shared TypeScript domain models between API routes and React client studios.

---

## ADR-002: Dual Database Strategy — SQLite (Local Dev) & PostgreSQL (Production) via Prisma 7 Driver Adapters

### Context
Developers and automated CI/E2E pipelines need zero-configuration local execution using file-based SQLite (`file:./dev.db`), while production deployments require horizontally scalable PostgreSQL (`prisma/schema.postgres.prisma`).

### Decision
Adopt **Prisma 7** (`@prisma/client` + `prisma.config.ts`) with runtime URL detection in `src/lib/prisma.ts`:
- When `DATABASE_URL` begins with `file:`, instantiate `PrismaClient` with `@prisma/adapter-better-sqlite3`.
- When `DATABASE_URL` begins with `postgres://` or `postgresql://`, instantiate `PrismaClient` with `@prisma/adapter-pg`.
- Maintain schema parity between `prisma/schema.prisma` (SQLite provider) and `prisma/schema.postgres.prisma` (PostgreSQL provider) using portable `String` union columns and JSON-serialized structured fields where needed.

### Consequences
- Local development runs out-of-the-box with `npm run db:setup` (`prisma generate && prisma db push && tsx prisma/seed.ts`).
- Production deployments run `npm run db:generate:postgres && npm run db:migrate:postgres`.

---

## ADR-003: Invite-Only Account Admission, Single-Use/Expiring Tokens, RBAC & CLI-Only Root Admin Bootstrap

### Context
The application must enforce strict invite-only registration with single-use and expiring invitation codes, role-based access control (`Admin`, `Editor`, `Viewer`), invitation rotation/revocation, and immutable audit logging, following the cross-repository specification in `../Arcade`. Crucially, no HTTP endpoint may ever be exposed for bootstrapping an initial administrator.

### Decision
1. **Fail-Closed Admission Policy (`ACCOUNT_ADMISSION_MODE`)**:
   - Defaults to `"invitation-only"`. Uninvited registration attempts via `POST /api/auth/register` or OAuth callbacks are rejected (`403 invitation_required`) and logged in `AuditLog`.
2. **Cryptographic Token Hashing (`tokenHash`)**:
   - Invitation tokens are 32-byte `base64url` random secrets. Only `sha256(token)` is stored in `AccountInvitation.tokenHash`.
   - Accepting, revoking, or expiring an invitation clears `tokenHash = null` and `activeForEmail = null`, guaranteeing strict **single-use** semantics.
3. **CLI-Only Admin Bootstrap (`npm run bootstrap:admin`)**:
   - Root admin accounts are created or promoted exclusively via `scripts/bootstrap-admin.ts` (`tsx scripts/bootstrap-admin.ts --email <email> --password-stdin`). Zero HTTP bootstrap routes exist.
4. **RBAC & Session Invalidation**:
   - Users carry `role` (`"Admin" | "Editor" | "Viewer"`), `status` (`"active" | "disabled"`), and `sessionVersion`. Role changes or account suspension increment `sessionVersion` and write to `AuditLog`.

### Consequences
- Eliminates public privilege-escalation vectors while giving administrators full lifecycle control (`/admin/invitations` & `/settings/team`) with complete auditability.

---

## ADR-004: Multi-File Virtual Project File System & Live Interactive Component Preview Engine

### Context
In Magic Patterns (`/c/[id]`), each design project is not a static image—it is a multi-file React + Tailwind project (`App.tsx`, `components/*.tsx`, `index.css`, `package.json`, `tailwind.config.js`) accompanied by an AI chat thread, version history snapshots, multi-screen frames (`Screens` tab), visual element editing (`Visual Edit`), and spatial comments (`Comments`).

### Decision
Store each Design Project (`DesignProject`) with:
- `filesJson`: Virtual file tree (`Record<string, { path: string; content: string; language: string }>`)
- `screensJson`: Array of screen definitions (`id`, `name`, `route`, `width`, `height`, `x`, `y`, `htmlPreview`, `componentCode`)
- `messagesJson`: Conversational chat history including thinking duration, tool calls, file edit diffs, and AI bullet summaries
- `versionsJson`: Immutable version snapshots created on every prompt or visual edit so users can `Restore` or `Fork` any historical revision
- `commentsJson`: Spatial canvas comments (`x`, `y`, `screenId`, `authorName`, `content`, `status: "OPEN" | "RESOLVED"`, `replies`)

In the `/c/[id]` studio, render the active screen inside a live sandboxed iframe (`srcDoc`) that compiles and executes the project's HTML/Tailwind/React template with postMessage bridges for **Visual Edit** (clicking any element highlights its bounding box and opens a live style/text inspector that updates both the preview and source code) and **Comments** (clicking anywhere drops an interactive comment pin).

### Consequences
- Fast, deterministic, zero-external-API-dependency interactive previews that also support optional real OpenAI/Anthropic keys configured in `/settings/integrations`.

---

## ADR-005: MagicOS Infinite Context Canvas (`/os/[id]`)

### Context
MagicOS (`/os/[id]`) is Magic Patterns' spatial canvas where product teams bring together context nodes (PRDs, GitHub repos, image references, generated UI screen variants, and MCP coding agent handoffs) on a zoomable, pannable 2D surface with a live AI assistant and transcript drawer.

### Decision
Model MagicOS canvases (`CanvasProject`) with spatial nodes (`nodesJson`: `prd`, `github_repo`, `image_ref`, `ui_variant`, `mcp_agent`, `sticky_note`), edges (`edgesJson`), viewport state (`zoom`, `panX`, `panY`), and transcript history (`transcriptJson`). Provide full interactive drag/pan/zoom, node creation, variant generation ("Generate 3 variants"), and MCP agent handoff ("Send to Claude Code / Cursor / Codex") directly on `/os/[id]`.
