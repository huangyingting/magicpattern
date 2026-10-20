# Magic Patterns — AI Design, Prototyping, Design Systems & MagicOS Platform

A full-stack AI UI generation, multi-screen prototyping, Design System synchronization, Slide Deck builder, and **MagicOS** infinite context canvas platform built with **Next.js 16 (App Router)**, **Auth.js / NextAuth**, **Prisma 7** (SQLite for local development, PostgreSQL for production), **Tailwind CSS**, and **Invite-Only RBAC Governance**.

---

## Architecture & Product Documentation (`/docs`)

- [`docs/00_EXPLORATION_COVERAGE_REPORT.md`](./docs/00_EXPLORATION_COVERAGE_REPORT.md) — Systematic Playwright exploration report & 66 captured screenshots across Desktop, Tablet, and Mobile viewports.
- [`docs/01_ADR_ARCHITECTURE_DECISION_RECORDS.md`](./docs/01_ADR_ARCHITECTURE_DECISION_RECORDS.md) — Architecture Decision Records (ADRs 001–007).
- [`docs/02_PRD_PRODUCT_REQUIREMENTS.md`](./docs/02_PRD_PRODUCT_REQUIREMENTS.md) — Product Requirements Document (PRD).
- [`docs/03_TECHNICAL_SPECIFICATION.md`](./docs/03_TECHNICAL_SPECIFICATION.md) — Technical Specification & API Contracts.
- [`docs/04_ARCHITECTURE_AND_DATA_MODEL.md`](./docs/04_ARCHITECTURE_AND_DATA_MODEL.md) — System Architecture & Dual SQLite/PostgreSQL Data Model.
- [`docs/05_IMPLEMENTATION_PLAN_AND_BACKLOG.md`](./docs/05_IMPLEMENTATION_PLAN_AND_BACKLOG.md) — Implementation Plan & Agile Task Backlog.
- [`docs/06_ACCEPTANCE_CRITERIA_AND_PARITY_MATRIX.md`](./docs/06_ACCEPTANCE_CRITERIA_AND_PARITY_MATRIX.md) — Acceptance Criteria & Feature-Parity Matrix.

---

## Quick Start (Local Development with SQLite)

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client, push SQLite schema, and seed workspace data
npm run db:setup

# 3. Bootstrap an initial Admin account via CLI (no HTTP bootstrap endpoint is exposed)
npm run bootstrap:admin -- --email=admin@magicpatterns.com --password="AdminPassword2026!" --name="Platform Admin"

# 4. Start development server
npm run dev

# 5. Run the 23-point Playwright E2E verification suite
npm run test:e2e
```

---

## Production Architecture Highlights

- **Strict Authentication & API Key Governance**: Every protected route and API endpoint requires a valid NextAuth JWT session, database session cookie, or `Authorization: Bearer mp_live_...` Workspace API Key (no anonymous fallbacks). Unauthenticated browsers are redirected to `/login` via Next.js Middleware (`src/middleware.ts`).
- **Invite-Only Registration & Cryptographic Password Reset**: Single-use SHA-256 hashed invitation tokens (`AccountInvitation`) and password reset tokens (`PasswordResetToken`) with rotation, revocation, expiry, and `410 Gone` replay protection.
- **Role-Based Access Control (RBAC)**: Strict enforcement of `Admin`, `Editor`, and `Viewer` permissions across all mutation endpoints with immutable `AuditLog` tracking (`rbac.denied`, `invite.*`, `user.role_change`, `project.export.zip`, `auth.password_reset.*`).
- **Live AI Provider & Token Extractor**: Supports Azure OpenAI (`AZURE_OPENAI_*`), OpenAI (`OPENAI_API_KEY`), and Anthropic (`ANTHROPIC_API_KEY`) with automatic high-speed deterministic synthesis fallback (`src/lib/production-engine/ai-provider.ts`) and live Website/GitHub CSS token extraction (`src/lib/production-engine/live-extractor.ts`).
- **Pure Node.js ZIP Archive Export & Healthcheck**: `GET /api/projects/[id]/export` streams standard CRC-32 `.zip` archives of generated React/Tailwind code; `GET /api/health` reports live DB latency, workspace counts, admission policy, and active LLM provider status.

---

## Production Deployment (PostgreSQL)

1. Copy `.env.production.example` to `.env` and set `DATABASE_URL="postgresql://..."`.
2. Run PostgreSQL migrations:
   ```bash
   npx prisma migrate deploy --schema=prisma/schema.postgres.prisma
   ```
3. Build and start:
   ```bash
   npm run build && npm run start
   ```
   Or deploy with Docker Compose:
   ```bash
   docker compose up --build -d
   ```
