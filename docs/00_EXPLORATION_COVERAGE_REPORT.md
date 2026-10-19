# Magic Patterns — Systematic Playwright Exploration & Coverage Report

**Target URL:** `https://www.magicpatterns.com`  
**Authenticated Session:** `Joshuah Powlowski` (`powlowskijoshuah@gmail.com`) — `Joshuah's Workspace (Free)`  
**Exploration Tooling:** Headless Chromium via Playwright (`exploration/explore_part1.js` – `explore_editor_tabs3.js`)  
**Total Captured Screenshots:** 66 screenshots in `/screenshots/` (`01_home_desktop.png` – `69_public_login.png`)  
**Structured DOM Telemetry:** `/exploration/probe1_home.json`, `part1_report.json` – `part6_report.json`

---

## 1. Executive Summary of Observed Product Capabilities

Magic Patterns is an AI-native UI design, prototyping, and product context platform built for product & engineering teams. Through systematic authenticated and unauthenticated Playwright exploration across desktop (`1440×900`), tablet (`768×1024`), and mobile (`390×844`) viewports, we identified four core creation modalities and a comprehensive workspace/settings ecosystem:

1. **AI Design Editor (`/c/[id]`)**:
   - Conversational prompt-to-UI generation with streaming thinking steps (`Thought for 6s`), tool execution badges (`1 tool used`, `4 edits made`), file-level diff pills (`Replaced package.json`, `Replaced index.css`, `components/RevenueMetricCard.tsx`), AI summary bullets, and follow-up suggestion chips.
   - Three primary workspace modes in the top segmented bar:
     - **Preview**: Live interactive React/Tailwind rendered preview with URL bar (`/index`), `Controls` (Responsive `100%`, Desktop `1280px`, Mobile `375px`, Custom dimensions), `Visual Edit` (click any DOM element to inspect/modify styles and text), `Comments` (pin spatial comment threads onto the canvas with Open/Resolved filtering), and `View in New Window`.
     - **Screens**: Multi-screen infinite canvas showing device frames (`1280×900`, `375×812`) with zoom controls (`24%`, `+`, `-`, `Fit`), per-screen actions (`Open Preview`, `Edit Screen`, `Duplicate`, `Delete`), and floating bottom tool dock (`Pointer`, `Hand`, `Text`, `+ Add Screen`).
     - **Code**: Multi-file virtual project IDE (`App.tsx`, `components/*.tsx`, `index.css`, `tailwind.config.js`, `package.json`, `README.md`) with file search, syntax-highlighted editor, live code edits, `Copy File`, and `Download ZIP`.
   - Rich collaboration & handoff actions:
     - **Export Menu**: `Send to Coding Agent (MCP)` (Cursor, Claude Code, Codex), `Sync with GitHub (Beta)`, `Copy to Figma` (editable Figma layers payload), `Download Code (.zip)`.
     - **Share Modal**: Collaborator email invites with role selector (`Editor` / `Viewer`), General Access controls (`Workspace` access level, `Anyone with the link` -> `Preview Only` / `Can View Code & Fork` / `No access`), published Preview URL (`https://project-...magicpatterns.app`) with `Copy`, `Customize`, `QR Code`, `Embed`, `Unpublish`, watermark badge toggle, and `Make a Template` switch.
     - **Editor Actions Menu**: `Back to Home`, `Rename`, `Move to...` (folder assignment), `Share`, `Version History` (restore or fork any revision), `Fork Design`, `Delete Design`.

2. **MagicOS Infinite Context Canvas (`/os/[id]`, `/os/new`)**:
   - Spatial product canvas where teams combine PRDs (`Checkout PRD`), connected GitHub repositories (`acme/web`), visual brand references (`brand-refs.jpg`), multi-variant UI explorations (`Checkout · Two column`, `Stepped`, `Express`), and MCP coding agent handoffs (`Claude Code`, `Cursor`, `Codex`).
   - Top-left floating toolbar (`Untitled` rename, `Pointer`, `Hand`, `Interact` tools), top-right controls (`Back to files`, `Hide/Show transcript`), and bottom multimodal prompt dock (`+ Add images or files`, `Talk to MagicOS` voice dictation, `Send`).

3. **Slide Deck Studio (`Create a Slide Deck` Modal & Editor)**:
   - Dual creation modes: **Prompt** (single-prompt presentation generation with suggested templates like `Quarterly review`, `Project kickoff`, `Sales pitch`) and **Outline** (slide-by-slide structured deck builder), styled automatically by the selected Design System.

4. **Design Systems Engine (`/design-systems`)**:
   - Two-step creation wizard:
     - **Step 1 (`Overview`)**: Name + logo upload + choice between `Yes, link a source (GitHub, Figma, or website)` or `No, start another way (Use an existing system or start blank)`.
     - **Step 2A (`Connect Sources`)**: `Link GitHub`, `Link Local Code`, `Link Figma`, `Link Your Website`.
     - **Step 2B (`Describe / Presets`)**: Custom CSS/token prompt editor with starter presets (`Start from Shadcn`, `Modern B2B SaaS`, `Playful Consumer App`), typography, color tokens, border radius, and reusable component definitions.

5. **Workspace Hub (`/dashboard`, `/dashboard/files`, `/dashboard/templates`) & 9-Section Settings Suite (`/settings/*`)**:
   - **Recents (`/dashboard`)**: Quick-create action bar (`Design`, `Slide Deck`, `Design System`, `MagicOS`), view tabs (`Recently viewed`, `Shared with Me`, `Shared with Workspace`), search/filter/sort (`Last Updated`, `Date Created`, `Alphabetical`, `Design system`, `Favorites only`), and Grid/List toggle.
   - **Files (`/dashboard/files`)**: Type tabs (`All Files`, `Designs`, `Canvas`, `Templates`), folder creation (`New Folder`), right-click context menu on cards (`Open`, `Rename`, `Duplicate`, `Move to folder`, `Favorite`, `Mark as template`, `Delete`).
   - **Templates (`/dashboard/templates`)**: Workspace & featured starter templates that can be forked into new designs in one click.
   - **Settings Suite (`/settings/*`)**:
     - `/settings/team`: Team member table (`Name`, `Role`, `Plan`, `Last Active`), search, `Export team as CSV`, `+ Invite` modal, and Upgrade callout.
     - `/settings/subscription`: Current Plan (`Free`), Credit Balance breakdown (`Rolled Over`, `Monthly Credits`, `Free Credits`, `Gifted`, `Purchased`, `Total Available`), Payment Method card, Invoices table, and `Upgrade Plan` modal (`Starter $20/mo`, `Business $100/mo`, `Enterprise Custom` with Monthly/Annual 15% toggle).
     - `/settings/workspace`: Workspace Logo uploader, Workspace Name editor, `Share new designs with the workspace` toggle, and Single Sign-On (SSO) configuration.
     - `/settings/usage-reports`: Timezone selector (`Local` / `UTC`), date range picker (`1D`, `1M`, `3M`, `1Y`), KPI summary cards (`Credit Usage`, `Designs Created`, `Messages Sent`), and category breakdown (`Design`, `Component`, `Canvas`).
     - `/settings/profile`: Contribution activity heatmap (`longest streak`, `tokens`), public Handle claim (`Claim Handle`), Personal Information (`First name`, `Last name`, avatar), Email Addresses (`Account email`, `Billing email`), and Connected Accounts (`LinkedIn`, `GitHub`, `Figma`).
     - `/settings/integrations`: External LLM API key vault (`OpenAI`, `Anthropic`).
     - `/settings/connectors`: Model Context Protocol (MCP) connectors (`Granola`, `Notion`, `Linear`, `Miro`, `Jira`, `Mobbin`) + `Add Custom MCP Connector` (Name, MCP Server URL, Authentication type: OAuth / Bearer Token).
     - `/settings/skills`: AI assistant `SKILL.md` registry (`Better Animation`, `Audit a11y`, enable/disable toggles, `Install Skill` via `npx skills add <repo> --skill <name>`, and `New Skill` custom markdown skill authoring).
     - `/settings/api-keys`: REST API & MCP Server key management (create, mask, copy, revoke keys).

---

## 2. Route & UI State Coverage Matrix

| # | Route / URL | UI States & Modals Explored | Viewport(s) | Screenshot Evidence | Status |
|---|---|---|---|---|---|
| 1 | `/dashboard` | Meet MagicOS 3-step onboarding modal (`Bring in your context`, `Generate variants`, `Hand it off`) | `1440×900` | `01_home_desktop.png`, `02_magicos_modal_step2.png`, `03_magicos_modal_step3.png` | Covered (100%) |
| 2 | `/dashboard` | Clean dashboard, Quick-create bar, Recents empty & populated states, Grid & List views | `1440×900`, `390×844` | `04_dashboard_clean.png`, `62_dashboard_with_files.png`, `64_mobile_dashboard.png` | Covered (100%) |
| 3 | `/dashboard` (Menus) | Sidebar `+ Create` menu, `Ctrl+K` Search modal, `Get free credits` modal, Workspace switcher, Account menu | `1440×900` | `05_dashboard_create_menu.png` – `09_account_menu.png` | Covered (100%) |
| 4 | `/dashboard` (New Design) | `New Design` prompt modal, `+ Add` context menu, `/ Commands` (`Ask`, `Plan`, `Inspiration`, `Debug`, `Polish`), Design System selector, Model selector, Import pills | `1440×900` | `31_create_design_editor.png`, `35_new_design_commands.png`, `46_new_design_add_menu.png`, `50_new_design_prompt_typed.png` | Covered (100%) |
| 5 | `/dashboard` (Slide Deck) | `Create a Slide Deck` modal (`Prompt` & `Outline` tabs, suggested prompts, Design System picker) | `1440×900` | `32_create_slide_deck.png` | Covered (100%) |
| 6 | `/dashboard/files` | All Files, Designs, Canvas, Templates tabs, Filter popover (`Design system`, `Favorites only`), Sort menu, `New Folder` modal | `1440×900` | `14_dashboard_files.png`, `27_files_filter_popover.png` | Covered (100%) |
| 7 | `/dashboard/templates` | Workspace & starter templates gallery, filter/sort, Grid/List toggle | `1440×900` | `15_dashboard_templates.png` | Covered (100%) |
| 8 | `/design-systems` | Design Systems hub, Create Design System wizard (`Overview`, `Connect Sources` [GitHub/Local/Figma/Website], `Start from Shadcn` / `Modern B2B SaaS` / `Playful Consumer App`) | `1440×900` | `16_design_systems.png`, `30_design_systems_new.png`, `34_design_systems_step2.png`, `44_design_systems_connect_sources.png`, `45_design_systems_shadcn_filled.png` | Covered (100%) |
| 9 | `/c/[id]` (Design Editor) | Streaming generation, Welcome tour, `Editor actions` menu, `Preview` mode, `Controls` (viewport sizing), `Visual Edit` inspector, `Comments` mode, `Screens` infinite canvas, `Code` IDE, `Export` menu, `Share` modal | `1440×900`, `390×844` | `51_design_editor_generating.png` – `62_editor_share_modal.png`, `65_mobile_editor.png` | Covered (100%) |
| 10 | `/os/new` & `/os/[id]` | MagicOS infinite canvas, pointer/hand/interact tools, transcript drawer, multimodal prompt dock | `1440×900` | `33_magicos_new.png` | Covered (100%) |
| 11 | `/settings/team` | Team directory, search, CSV export, `Invite teammates` modal, tablet layout | `1440×900`, `768×1024` | `17_settings_team.png`, `18_settings_team_invite.png`, `66_tablet_settings_team.png` | Covered (100%) |
| 12 | `/settings/subscription` | Plan card, Credit Balance ledger, Payment card preview, Invoices table, `Upgrade Plan` modal (`Starter`, `Business`, `Enterprise`) | `1440×900` | `19_settings_subscription.png`, `43_upgrade_plan.png` | Covered (100%) |
| 13 | `/settings/workspace` | Logo upload, Workspace name, auto-share toggle, Enterprise SSO config | `1440×900` | `20_settings_workspace.png` | Covered (100%) |
| 14 | `/settings/usage-reports` | Timezone & date range selectors (`1D`, `1M`, `3M`, `1Y`), KPI cards, adoption charts | `1440×900` | `21_settings_usage_reports.png` | Covered (100%) |
| 15 | `/settings/profile` | Activity heatmap, Handle claim, Personal info, Email addresses, LinkedIn/GitHub/Figma connections | `1440×900` | `22_settings_profile.png` | Covered (100%) |
| 16 | `/settings/integrations` | External LLM API key management + `Add Key` provider menu (`OpenAI`, `Anthropic`) | `1440×900` | `23_settings_integrations.png`, `39_integrations_add_key_modal.png` | Covered (100%) |
| 17 | `/settings/connectors` | MCP Connectors catalog (`Granola`, `Notion`, `Linear`, `Miro`, `Jira`, `Mobbin`) + `Add Custom MCP Connector` | `1440×900` | `24_settings_connectors.png`, `40_connectors_add_custom_modal.png` | Covered (100%) |
| 18 | `/settings/skills` | `SKILL.md` catalog (`Better Animation`, `Audit a11y`), `Install Skill` CLI modal, `New Skill` editor | `1440×900` | `25_settings_skills.png`, `41_skills_install_modal.png`, `42_skills_new_modal.png` | Covered (100%) |
| 19 | `/settings/api-keys` | REST API & MCP key generation and plan gate | `1440×900` | `26_settings_api_keys.png` | Covered (100%) |
| 20 | `/`, `/pricing`, `/login` | Unauthenticated marketing landing page, public pricing tiers, sign-in screen | `1440×900` | `67_public_landing.png`, `68_public_pricing.png`, `69_public_login.png` | Covered (100%) |

---

## 3. Observed Edge Cases, Error States & UX Details

1. **Empty State Progressive Disclosure**:
   - Empty views (`Recents`, `Files`, `Templates`, `Design Systems`, `Comments`, `Integrations`, `Invoices`) use dashed-border cards with contextual CTA buttons (`Create your first design above.`, `Mark a design as a template to get started.`, `Create your first design system.`).
2. **Command-Driven Prompting (`/`)**:
   - Typing `/` or clicking `Commands` inside any prompt box opens a grouped command palette with two categories:
     - **Chat Mode**: `Ask` ("Discuss without making any changes"), `Plan` ("Brainstorm & create a plan")
     - **Skills**: `Inspiration` ("Explore multiple variants of an idea"), `Debug` ("Find and fix a bug"), `Polish` ("Improve & tidy up the design"), plus any enabled custom `SKILL.md` packages.
3. **Credit Balance Accounting**:
   - Every workspace tracks `Rolled Over`, `Monthly Credits`, `Free Credits`, `Gifted`, and `Purchased` credits separately, displaying `Total Available` in the account dropdown and `/settings/subscription`.
   - Submitting a social post link in `Get free credits` (`Share the Magic, get 250 free credits`) validates that the URL is a valid LinkedIn or X post before submission.
4. **Responsive Adaptations**:
   - At `< 768px` (mobile), the left navigation sidebar collapses into a slide-over drawer triggered by `Toggle navigation`.
   - Inside `/c/[id]` on mobile (`65_mobile_editor.png`), the split pane converts into a bottom-sheet / tab toggle between `Chat` and `Preview/Code`.
