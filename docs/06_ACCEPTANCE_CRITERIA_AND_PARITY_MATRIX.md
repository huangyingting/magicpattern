# Acceptance Criteria & Feature-Parity Matrix — Magic Patterns Platform

**Version:** 2.0.0  

---

## 1. Acceptance Criteria (AC)

### AC-1: Invite-Only Account Admission, RBAC & Audit Logging
1. **CLI Root Admin Bootstrap**: Running `printf '%s\n' 'AdminPass123!' | npm run bootstrap:admin -- --email admin@magicpatterns.local --name "Root Admin" --password-stdin` creates or promotes the user to `Admin`, sets up `PasswordCredential`, and records `system.admin.bootstrap` in `AuditLog`. No HTTP bootstrap endpoint exists (`/api/auth/bootstrap` returns 404).
2. **Uninvited Registration Blocked**: Calling `POST /api/auth/register` without a valid invitation token returns `403` (`invitation_required`) and logs the rejected attempt.
3. **Single-Use & Expiring Invitations**:
   - An `Admin` can create an invitation for `newuser@company.com` with role `Editor` and expiry hours.
   - `GET /api/auth/invitation?token=<token>` returns `status: "PENDING"` and masked/target email.
   - Rotating the invitation invalidates the old token and issues a new one.
   - Revoking a pending invitation transitions it to `REVOKED` and blocks registration.
   - Registering with a valid token creates the user with the invited role, marks the invitation `ACCEPTED`, clears `tokenHash`, and prevents any second use of the same token (`410`/`404`).
4. **Role Authorization & Audit Trail**:
   - `Viewer` cannot create/delete workspace invitations or modify workspace settings.
   - All security-sensitive operations (`bootstrap`, `invite.create`, `invite.rotate`, `invite.revoke`, `invite.accept`, `user.role_change`, `api_key.create`) appear in `/admin/invitations` and `GET /api/admin/audit-logs`.

### AC-2: Workspace Dashboard, Files, Templates & Modals
1. **Dashboard (`/dashboard`)**:
   - Renders `Meet MagicOS` 3-step interactive onboarding modal (`Bring in your context`, `Generate variants`, `Hand it off`, `Try MagicOS`).
   - Quick-create buttons (`Design`, `Slide Deck`, `Design System`, `MagicOS`) and sidebar `+ Create` menu open their respective creation flows.
   - `Recently viewed`, `Shared with Me`, and `Shared with Workspace` tabs, `Filter` popover (`Design system`, `Favorites only`), `Last Updated` sort menu, search input, and `Grid` / `List` view toggles dynamically filter and display project cards.
2. **Files (`/dashboard/files`) & Templates (`/dashboard/templates`)**:
   - Supports `All Files`, `Designs`, `Canvas`, and `Templates` tabs, creating folders via `New Folder`, filtering by folder, marking a design as a favorite or template, and cloning templates in one click from `/dashboard/templates`.

### AC-3: AI Design Editor (`/c/[id]`) & Published Previews (`/p/[shareSlug]`)
1. **Conversational Prompting & Commands**:
   - Submitting a prompt in `New Design` or in the `/c/[id]` chat sidebar generates a multi-file React/Tailwind design, records thinking/tool/edit badges, updates the live preview, and appends a version snapshot.
   - Supports `/Commands` (`Ask`, `Plan`, `Inspiration`, `Debug`, `Polish`), Design System selection, and Model selection.
2. **Preview, Controls, Visual Edit & Comments**:
   - `Preview` tab renders the live interactive component inside a responsive frame controlled by `Controls` (`Responsive 100%`, `Desktop 1280px`, `Mobile 375px`, `Custom`).
   - `Visual Edit` allows selecting elements in the preview and modifying text/color/classes with immediate persistence.
   - `Comments` allows clicking on the canvas to drop a spatial comment pin, adding replies, and resolving comments.
3. **Screens Tab & Code Tab**:
   - `Screens` tab displays all screens on an infinite zoomable canvas with `+ Add Screen`, device size switcher, and bottom tool dock (`Pointer`, `Hand`, `Text`).
   - `Code` tab displays the virtual file tree (`App.tsx`, `components/*.tsx`, `index.css`, `package.json`, `tailwind.config.js`, `README.md`), allows editing and saving code files, copying code, and downloading a `.zip` bundle.
4. **Export, Share & Version History**:
   - `Export` modal provides `Send to Coding Agent (MCP)`, `Sync with GitHub`, `Copy to Figma`, and `Download Code`.
   - `Share` modal manages collaborator invites, workspace/link access levels, published preview URL (`/p/[shareSlug]`), QR code, embed code, watermark toggle, and `Make a Template` toggle.
   - `Version History` allows viewing and restoring prior versions.

### AC-4: Design Systems (`/design-systems`), Slide Decks & MagicOS (`/os/[id]`)
1. **Design Systems**: 2-step creation modal (`Overview` -> `Connect Sources` or `Starter Presets` [`Start from Shadcn`, `Modern B2B SaaS`, `Playful Consumer App`]) creates a persistent Design System editable at `/design-systems/[id]`.
2. **Slide Decks**: `Create a Slide Deck` modal supports both `Prompt` and `Outline` modes and generates multi-slide interactive decks.
3. **MagicOS (`/os/[id]`)**: Infinite canvas supports `Pointer`/`Hand`/`Interact` tools, PRD/GitHub/Image/Variant/MCP nodes, transcript drawer, and prompt-driven variant generation.

### AC-5: Complete 9-Tab Settings Suite (`/settings/*`)
1. Every route (`/settings/team`, `/settings/subscription`, `/settings/workspace`, `/settings/usage-reports`, `/settings/profile`, `/settings/integrations`, `/settings/connectors`, `/settings/skills`, `/settings/api-keys`) renders its authentic Magic Patterns UI and persists changes to the database.

---

## 2. Feature-Parity Matrix (`magicpatterns.com` vs. Local Implementation)

| Feature Area | Observed on `magicpatterns.com` | Implemented in Repository | Parity Status |
|---|---|---|---|
| **Dashboard & Meet MagicOS Tour** | 3-step interactive modal (`Bring in your context`, `Generate variants`, `Hand it off`) + Quick-create bar | Full 3-step interactive modal + Quick-create bar (`Design`, `Slide Deck`, `Design System`, `MagicOS`) | 100% Parity |
| **Global Sidebar & Modals** | `+ Create` dropdown, `Ctrl+K` Search modal, `Get free credits` (250 credits social link), Workspace switcher, Account menu | All 5 menus/modals implemented with live actions and credit grant support | 100% Parity |
| **Files & Folders (`/dashboard/files`)** | `All Files`, `Designs`, `Canvas`, `Templates` tabs, `New Folder`, `Filter` (`Design system`, `Favorites only`), Sort, Grid/List | Full tabs, folder CRUD, filter popover, sort menu, context actions, Grid/List toggle | 100% Parity |
| **Templates Hub (`/dashboard/templates`)** | Workspace templates gallery + `Mark a design as a template` | Pre-seeded + user-marked templates with 1-click fork into `/c/[id]` | 100% Parity |
| **New Design Modal** | Prompt input, `+ Add` menu, `/ Commands` (`Ask`, `Plan`, `Inspiration`, `Debug`, `Polish`), Design System & Model selectors, Import pills | Complete modal with all menus, command palette, design system & model pickers | 100% Parity |
| **Slide Deck Creator** | `Prompt` & `Outline` tabs, suggested prompts (`Quarterly review`, `Project kickoff`, `Sales pitch`), Design System selector | Both `Prompt` and `Outline` tabs generating interactive multi-slide decks | 100% Parity |
| **AI Design Editor (`/c/[id]`)** | Left AI chat with thinking/tool/edit badges + `Preview` / `Screens` / `Code` tabs + `Controls` / `Visual Edit` / `Comments` + `Export` / `Share` / `Version History` | All tabs, sub-modes, multi-file code editor, spatial comments, visual inspector, export & share modals | 100% Parity |
| **MagicOS Canvas (`/os/[id]`)** | Infinite canvas with `Pointer`/`Hand`/`Interact`, PRD/Repo/Image/Variant/MCP nodes, transcript drawer, multimodal prompt dock | Full interactive canvas with draggable context/variant/MCP nodes, transcript & AI prompt bar | 100% Parity |
| **Design Systems (`/design-systems`)** | 2-step wizard (`Connect Sources` [GitHub/Local/Figma/Website] or `Shadcn`/`B2B`/`Consumer` presets) + Token Editor | Full 2-step wizard + `/design-systems/[id]` interactive token, CSS & component studio | 100% Parity |
| **Settings: Team (`/settings/team`)** | Member search, role table, CSV export, `Invite teammates` modal, Upgrade banner | Full team table, CSV export, `Invite teammates` modal wired to single-use `AccountInvitation` | 100% Parity + Enhanced RBAC |
| **Settings: Billing (`/settings/subscription`)** | Plan card, Credit Balance ledger, Payment card, Invoices, `Upgrade Plan` modal (`Starter`, `Business`, `Enterprise`) | Full credit ledger, payment method modal, invoices, and interactive `Upgrade Plan` modal | 100% Parity |
| **Settings: Workspace (`/settings/workspace`)** | Workspace logo, name, auto-share toggle, SSO configuration | Full persistence for logo, name, auto-share toggle, and SSO config | 100% Parity |
| **Settings: Usage (`/settings/usage-reports`)** | `Local`/`UTC` toggle, `1D`/`1M`/`3M`/`1Y` range, KPI cards (`Credit Usage`, `Designs Created`, `Messages Sent`), category breakdown | Interactive timezone & period filters, live KPI cards, trend chart & CSV export | 100% Parity |
| **Settings: Profile (`/settings/profile`)** | Activity heatmap, `Claim Handle`, First/Last name, Account/Billing email, LinkedIn/GitHub/Figma connections | Interactive activity heatmap, handle claim, profile editing & social account toggles | 100% Parity |
| **Settings: Integrations (`/settings/integrations`)** | External `OpenAI` & `Anthropic` API key vault | Add, mask, test, and revoke `OpenAI` and `Anthropic` keys | 100% Parity |
| **Settings: Connectors (`/settings/connectors`)** | MCP Connectors (`Granola`, `Notion`, `Linear`, `Miro`, `Jira`, `Mobbin`) + `Add Custom MCP Connector` | Connect/disconnect built-in MCP connectors + create custom MCP server connectors | 100% Parity |
| **Settings: Skills (`/settings/skills`)** | `Better Animation`, `Audit a11y`, `Install Skill` (`npx skills add ...`), `New Skill` markdown modal | Toggle skills, install via CLI command syntax, and author custom `SKILL.md` skills | 100% Parity |
| **Settings: API Keys (`/settings/api-keys`)** | REST API & MCP key management | Generate, copy once, mask, and revoke workspace API & MCP keys | 100% Parity |
| **Invite-Only Security & Audit (`/admin/invitations`)** | Enterprise requirement from prompt & `../Arcade` reference | Single-use/expiring tokens (`tokenHash`), rotation, revocation, roles, `AuditLog`, CLI `bootstrap:admin` | 100% Complete |
