# Implementation Plan & Task Backlog — Magic Patterns Platform

**Version:** 2.0.0  

---

## 1. Phased Implementation Plan

### Phase 1: Playwright Discovery & Architectural Blueprint (`DONE`)
- Authenticate against `https://www.magicpatterns.com` using `.cred` cookies.
- Capture 66 screenshots across all routes, modals, editor states, and viewports (`1440×900`, `768×1024`, `390×844`).
- Author ADR, PRD, Technical Specification, Architecture & Data Model, Implementation Plan, and Acceptance Criteria / Feature-Parity documents.

### Phase 2: Scaffolding, Dual Prisma Schemas & Invite-Only Admission Engine
- Configure `package.json`, TypeScript, Tailwind CSS, Next.js 16, and `prisma.config.ts`.
- Create `prisma/schema.prisma` (SQLite) and `prisma/schema.postgres.prisma` (PostgreSQL) with 100% model parity.
- Implement `src/lib/prisma.ts` (automatic driver adapter selection) and `src/lib/account-admission/*` (`errors`, `policy`, `tokens`, `passwords`, `bootstrap`, `invitations`, `registration`, `social`, `audit`, `index`).
- Implement `scripts/bootstrap-admin.ts` (`npm run bootstrap:admin`) and `prisma/seed.ts` with rich initial workspace data (Joshuah's Workspace, pre-built Design Projects, Slide Decks, Templates, Design Systems, MagicOS Canvas, MCP Connectors, Featured Skills, Usage Telemetry, and Audit Logs).

### Phase 3: Backend API Routes (`src/app/api/**`)
- Implement NextAuth handler (`/api/auth/[...nextauth]`), invitation inspection (`/api/auth/invitation`), and invitation-gated registration (`/api/auth/register`).
- Implement Admin Invitations & Audit APIs (`/api/admin/invitations`, `/api/admin/invitations/[id]`, `/api/admin/invitations/[id]/rotate`, `/api/admin/users/[id]`, `/api/admin/audit-logs`).
- Implement Projects & AI Studio APIs (`/api/projects`, `/api/projects/[id]`, `/api/projects/[id]/chat`, `/api/projects/[id]/fork`).
- Implement Folders (`/api/folders`), Design Systems (`/api/design-systems`, `/api/design-systems/[id]`), MagicOS Canvases (`/api/canvases`, `/api/canvases/[id]`), and unified Settings API (`/api/settings`).

### Phase 4: Frontend UI & Interactive Studios (`src/app/**`)
- Build shared workspace shell (`WorkspaceShell`: collapsible left sidebar, `+ Create` dropdown, `Ctrl+K` Search modal, `Get free credits` modal, Workspace switcher, Account dropdown, responsive mobile drawer).
- Build `/dashboard`, `/dashboard/files`, and `/dashboard/templates` with `Meet MagicOS` 3-step onboarding modal, `New Design` modal (with `+ Add`, `/ Commands`, Design System picker, Model picker), `Create a Slide Deck` modal (`Prompt` & `Outline` tabs), `New Folder` modal, filters, sorting, and Grid/List views.
- Build `/design-systems` & `/design-systems/[id]` (2-step creation wizard + live token/component editor).
- Build `/c/[id]` **AI Design Editor** (`Preview` with responsive viewport `Controls`, interactive `Visual Edit` DOM inspector, spatial `Comments`, `Screens` multi-screen infinite canvas, `Code` multi-file IDE with ZIP download, `Export` modal [MCP, GitHub, Figma, ZIP], `Share` modal, `Version History`, and `/p/[shareSlug]` live published view).
- Build `/os/new` & `/os/[id]` **MagicOS Infinite Context Canvas** (spatial PRD, GitHub repo, brand image, UI variant frames, MCP coding agent nodes, pan/zoom/interact tools, and AI transcript).
- Build all 9 `/settings/*` pages (`team`, `subscription`, `workspace`, `usage-reports`, `profile`, `integrations`, `connectors`, `skills`, `api-keys`) + `/admin/invitations` + `/invite/[token]` + `/login` + `/register` + `/` + `/pricing`.

### Phase 5: End-to-End Verification & Regression Suite
- Run `npm run db:setup` and `npm run build` to verify zero TypeScript or Next.js build errors.
- Test `npm run bootstrap:admin` CLI script.
- Execute comprehensive Playwright E2E test suite (`tests/verify-all-features.mjs`) visiting and testing all features, combinations, edge cases, and responsive layouts.

---

## 2. Prioritized Task Backlog

| ID | Epic | Task | Priority | Status |
|---|---|---|---|---|
| MP-01 | Discovery | Playwright exploration of `magicpatterns.com` with `.cred` (66 screenshots) | P0 | Done |
| MP-02 | Docs | ADR, PRD, Spec, Data Model, Plan, Acceptance Criteria & Parity Matrix | P0 | Done |
| MP-03 | Data/Auth | Dual SQLite/Postgres Prisma schemas + `prisma.config.ts` + `src/lib/prisma.ts` | P0 | Pending |
| MP-04 | Data/Auth | `src/lib/account-admission/*` + `AuditLog` + `scripts/bootstrap-admin.ts` | P0 | Pending |
| MP-05 | Seed | Rich initial seed (`prisma/seed.ts`) with designs, slide decks, templates, design systems, MagicOS canvas, skills, connectors | P0 | Pending |
| MP-06 | API | Auth, Invitation lifecycle (create/inspect/accept/rotate/revoke), User RBAC & Audit Log APIs | P0 | Pending |
| MP-07 | API | AI UI Generation Engine + Projects, Chat, Fork, Folders, Design Systems, MagicOS & Settings APIs | P0 | Pending |
| MP-08 | UI | Public Landing (`/`), Pricing (`/pricing`), Login (`/login`), Register (`/register`), Invite (`/invite/[token]`), Admin Console (`/admin/invitations`) | P0 | Pending |
| MP-09 | UI | Dashboard (`/dashboard`), Files (`/dashboard/files`), Templates (`/dashboard/templates`) + Modals (`Meet MagicOS`, `New Design`, `Slide Deck`, `Search`, `Free Credits`) | P0 | Pending |
| MP-10 | UI | AI Design Editor (`/c/[id]`) — Chat, Preview, Controls, Visual Edit, Comments, Screens Canvas, Multi-File Code IDE, Export, Share, Version History & `/p/[shareSlug]` | P0 | Pending |
| MP-11 | UI | Design Systems (`/design-systems`, `/design-systems/[id]`) & MagicOS Infinite Canvas (`/os/[id]`) | P0 | Pending |
| MP-12 | UI | Complete 9-Page Settings Suite (`/settings/team`, `subscription`, `workspace`, `usage-reports`, `profile`, `integrations`, `connectors`, `skills`, `api-keys`) | P0 | Pending |
| MP-13 | QA | Automated Playwright E2E verification (`tests/verify-all-features.mjs`) covering all feature combinations & responsive viewports | P0 | Pending |
