# Product Requirements Document (PRD) — Magic Patterns Platform

**Product Name:** Magic Patterns (Enterprise Invite-Only Edition)  
**Version:** 2.0.0  

---

## 1. Product Vision & Goals

Magic Patterns empowers product managers, designers, and engineers to turn product ideas, PRDs, and design system tokens into production-ready UI components, multi-screen prototypes, slide decks, and infinite-canvas explorations (`MagicOS`) in seconds. This implementation delivers full feature parity with `https://www.magicpatterns.com` combined with enterprise-grade invite-only account admission, role-based access control (`Admin`, `Editor`, `Viewer`), and immutable security audit logging.

---

## 2. Target Personas

1. **Workspace Administrator (`Admin`)**:
   - Provisions the initial admin account via `npm run bootstrap:admin`, issues single-use/expiring invitation links, rotates or revokes invitations, manages team roles, configures workspace settings/SSO/API keys, and audits security events.
2. **Product Designer / PM / Engineer (`Editor`)**:
   - Generates UI designs via conversational prompts and `/commands`, edits elements visually or in the multi-file Code IDE, explores multi-screen flows on the `Screens` canvas, orchestrates PRDs and variants in `MagicOS`, builds Slide Decks, defines Design Systems, and exports to Figma, GitHub, ZIP, or MCP coding agents.
3. **Stakeholder / Reviewer (`Viewer`)**:
   - Browses shared designs, inspects responsive previews (`Desktop`, `Mobile`, `Custom`), leaves spatial comments on designs, and views published preview links (`/p/[shareSlug]`).

---

## 3. Core Functional Requirements

### FR-1: Invite-Only Authentication, RBAC & Audit Logging
- **FR-1.1**: Default to `invitation-only` admission mode. Block uninvited registrations (`POST /api/auth/register`) and uninvited OAuth logins with clear error messaging and audit trail entries.
- **FR-1.2**: Provide CLI script `npm run bootstrap:admin` (`scripts/bootstrap-admin.ts`) supporting `--email`, `--name`, and `--password-stdin`. Never expose an HTTP bootstrap endpoint.
- **FR-1.3**: Provide Admin Invitation & Security Console (`/admin/invitations` and integrated tab in `/settings/team`) to create invitations with configurable role (`Admin`, `Editor`, `Viewer`) and expiration window, copy one-time `/invite/[token]` URLs, rotate tokens, revoke pending invites, and inspect the immutable `AuditLog`.
- **FR-1.4**: Provide `/invite/[token]` acceptance page displaying invitation status (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`), masked/target email, assigned role, expiration timestamp, and registration form.

### FR-2: Workspace Dashboard, Files & Templates Hub (`/dashboard`, `/dashboard/files`, `/dashboard/templates`)
- **FR-2.1**: Display top bar with sidebar collapse toggle, workspace switcher (`Joshuah's Workspace` + plan badge), `Get free credits` modal (`Share the Magic, get 250 free credits`), `Invite Team` shortcut, and Account Menu dropdown (`100 credits`, `Settings`, `Manage Workspace`, `Billing & Subscription`, `Admin Invitations`, `Log out`).
- **FR-2.2**: Support the 3-step interactive **"Meet MagicOS"** onboarding modal (`Bring in your context`, `Generate variants`, `Hand it off`, `Try MagicOS`).
- **FR-2.3**: Provide quick-create bar (`Design`, `Slide Deck`, `Design System`, `MagicOS`) and sidebar `+ Create` menu + `Ctrl+K` global search modal.
- **FR-2.4**: Filter designs by tab (`Recently viewed`, `Shared with Me`, `Shared with Workspace` on `/dashboard`; `All Files`, `Designs`, `Canvas`, `Templates` on `/dashboard/files`), filter popover (`Design system`, `Favorites only`), sort dropdown (`Last Updated`, `Date Created`, `Alphabetical`), search input, and Grid/List view toggle.
- **FR-2.5**: Support folders (`New Folder`, move design to folder) and per-card actions (`Open`, `Rename`, `Duplicate / Fork`, `Favorite`, `Mark as Template`, `Share`, `Delete`).

### FR-3: AI Design Editor (`/c/[id]`) & New Design Modal
- **FR-3.1**: In the `New Design` modal, support prompt input, `+ Add` context menu (`Upload File`, `Add Component`, `Connect GitHub`, `Connectors`, `Skills`), `/ Commands` palette (`Ask`, `Plan`, `Inspiration`, `Debug`, `Polish`), Design System selector (`Base` or custom design systems), AI model selector (`Auto`, `Claude 3.7 Sonnet`, `GPT-4o`, `Gemini Pro`), and quick-action pills (`Recreate a screenshot`, `Import from GitHub`, `Import from Figma`, `Create a slide deck`).
- **FR-3.2**: In `/c/[id]`, provide the left AI Chat & Activity panel showing user prompts, collapsible thinking/tool execution logs (`Thought for 6s`, `1 tool used`, `4 edits made` with file badges), AI summary bullets, message actions (`Copy`, `Retry`, `Fork`, `Restore`, `View Code`), follow-up suggestion pills, and iterative follow-up prompting (including dark mode toggle, adding charts/tables/forms, or applying `/Polish`, `/Debug`, `/Inspiration`).
- **FR-3.3**: Provide **Preview** mode with live interactive component rendering, URL route selector (`/index`, `/analytics`, `/settings`, etc.), `Controls` popover (`Responsive 100%`, `Desktop 1280px`, `Mobile 375px`, `Custom`), **Visual Edit** mode (click any element in the preview to edit text, colors, padding, classes), and **Comments** mode (click anywhere on the canvas to drop a spatial comment pin, reply, and resolve/reopen comments).
- **FR-3.4**: Provide **Screens** mode displaying all screens of the design on a zoomable dotted canvas (`24%`–`100%`), device dimension headers, per-screen toolbar (`Open Preview`, `Edit Screen`, `Desktop/Mobile` toggle, `Duplicate`), and bottom dock (`Pointer`, `Hand`, `Text`, `+ Add Screen`).
- **FR-3.5**: Provide **Code** mode with a multi-file virtual file tree (`App.tsx`, `components/*.tsx`, `index.css`, `package.json`, `tailwind.config.js`, `README.md`), file search, syntax-highlighted code editor with live editing & save, `Copy File`, and `Download ZIP`.
- **FR-3.6**: Provide **Export** menu (`Send to Coding Agent (MCP)` with copyable MCP config/command for Cursor/Claude Code/Codex, `Sync with GitHub (Beta)`, `Copy to Figma` SVG/layer clipboard export, `Download Code (.zip)`) and **Share** modal (collaborator invites, workspace/public link permissions, live published preview link `/p/[shareSlug]`, embed snippet, QR code, and `Make a Template` toggle).
- **FR-3.7**: Provide **Version History** drawer/modal allowing users to inspect and restore or fork any prior revision.

### FR-4: Slide Deck Creator & Presentation Studio
- **FR-4.1**: Provide `Create a Slide Deck` modal with `Prompt` tab (topic input + `Quarterly review`, `Project kickoff`, `Sales pitch` presets) and `Outline` tab (add/reorder/edit slide titles & key points), plus Design System selector.
- **FR-4.2**: Generate multi-slide interactive HTML/React presentations that open in `/c/[id]` with slide navigation, speaker notes, and full Preview/Screens/Code editing.

### FR-5: Design Systems Studio (`/design-systems` & `/design-systems/[id]`)
- **FR-5.1**: Provide the 2-step `Create Design System` modal (`Overview` -> `Connect Sources` [GitHub, Local Code, Figma, Website] OR `Describe / Starter Presets` [`Start from Shadcn`, `Modern B2B SaaS`, `Playful Consumer App`]).
- **FR-5.2**: Provide a dedicated Design System Editor (`/design-systems/[id]`) where users can edit color tokens (Primary, Secondary, Accent, Background, Surface, Border), typography (Heading font, Body font, Mono font, scale), border radius, shadow tokens, custom CSS variables, and live preview components (`Buttons`, `Cards`, `Inputs`, `Badges`, `Charts`), and apply the Design System to any new or existing Design.

### FR-6: MagicOS Infinite Context Canvas (`/os/new` & `/os/[id]`)
- **FR-6.1**: Provide an interactive infinite dotted canvas with `Pointer`, `Hand`, and `Interact` tools, zoom/pan controls, and a collapsible AI `Transcript` panel.
- **FR-6.2**: Allow adding & interacting with spatial context nodes: **PRD Document** (`Checkout PRD`), **GitHub Repo** (`acme/web`), **Image Reference** (`brand-refs.jpg`), **Generated UI Variants** (side-by-side interactive preview frames on the canvas), and **MCP Coding Agent Handoff** (`Claude Code`, `Cursor`, `Codex`).
- **FR-6.3**: Support bottom multimodal prompt bar (`+ Add images or files`, `Talk to MagicOS`, prompt input) that generates new variant nodes directly onto the canvas.

### FR-7: Complete 9-Page Settings Suite (`/settings/*`)
- **FR-7.1**: Implement all 9 settings pages with real database persistence:
  1. `/settings/team` — Team Members table, search, role management, CSV export, `Invite teammates` modal (wired to `AccountInvitation` single-use tokens), and link to `/admin/invitations`.
  2. `/settings/subscription` — Plan overview, Credit Balance breakdown (`Rolled Over`, `Monthly`, `Free`, `Gifted`, `Purchased`, `Total Available`), Payment Method modal, Invoices table, and `Upgrade Plan` modal (`Starter $20`, `Business $100`, `Enterprise Custom`, Monthly/Annual toggle).
  3. `/settings/workspace` — Logo upload/color, Workspace name update, `Share new designs with the workspace` toggle, Enterprise SSO settings.
  4. `/settings/usage-reports` — `Local (UTC)` / `UTC` toggle, `1D` / `1M` / `3M` / `1Y` range selector, live workspace telemetry metrics (`Credit Usage`, `Designs Created`, `Messages Sent`), category breakdown (`Design`, `Component`, `Canvas`), and CSV export.
  5. `/settings/profile` — Contribution heatmap, `Claim Handle` modal, First/Last name update, Account & Billing email settings, and LinkedIn/GitHub/Figma connection toggles.
  6. `/settings/integrations` — `Add Key` / `Connect New Key` for `OpenAI` and `Anthropic` API keys with masked storage and revocation.
  7. `/settings/connectors` — MCP Connectors (`Granola`, `Notion`, `Linear`, `Miro`, `Jira`, `Mobbin`) connect/disconnect toggles + `Add Custom MCP Connector` modal (`Name`, `MCP Server URL`, `Authentication`: OAuth / Bearer Token).
  8. `/settings/skills` — AI Skills registry (`Better Animation`, `Audit a11y`, plus user-installed skills) with enable/disable toggles, `Install Skill` modal (`npx skills add <repo> --skill <name>`), and `New Skill` markdown modal.
  9. `/settings/api-keys` — Generate, view masked, copy once, and revoke Magic Patterns REST API & MCP Server keys.
