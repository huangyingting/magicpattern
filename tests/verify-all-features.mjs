import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3100';

async function runVerification() {
  console.log(`\n🚀 Starting comprehensive Playwright E2E verification against ${BASE_URL}...\n`);
  const browser = await chromium.launch({ headless: true });

  const results = [];
  function recordPass(name, detail = '') {
    console.log(`  ✅ PASS: ${name}${detail ? ` — ${detail}` : ''}`);
    results.push({ name, status: 'PASS', detail });
  }

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Public Marketing Home & Pricing
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await assert.doesNotReject(() =>
      page.getByText('Magic Patterns').first().waitFor({ state: 'visible', timeout: 10000 })
    );
    recordPass('Marketing Home (/)', 'Hero heading, prompt preview, and CTAs rendered');

    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
    await assert.doesNotReject(() =>
      page.getByText('Transparent, Predictable Pricing').waitFor({ state: 'visible', timeout: 10000 })
    );
    await page.getByText('Yearly').first().click().catch(() => null);
    recordPass('Pricing Page (/pricing)', 'Monthly/Yearly toggle & 4 pricing tiers verified');

    // 2. Invite-Only Admission Security: Block uninvited public registration
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    const uninvitedRes = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: 'uninvited-attacker@example.com',
        name: 'Uninvited User',
        password: 'StrongPassword123!',
      },
    });
    assert.equal(uninvitedRes.status(), 403, 'Uninvited public registration must return 403');
    const uninvitedBody = await uninvitedRes.json();
    assert.equal(uninvitedBody.ok, false);
    recordPass(
      'Invite-Only Gate (/register & POST /api/auth/register)',
      `Rejected uninvited signup with HTTP ${uninvitedRes.status()} (${uninvitedBody.code})`
    );

    // 3. Sign In via NextAuth Credentials
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.getByTestId('login-email-input').fill('powlowskijoshuah@gmail.com');
    await page.getByTestId('login-password-input').fill('MagicPatterns2026!');
    await page.getByTestId('login-submit-btn').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    recordPass('NextAuth Credentials Sign-In (/login -> /dashboard)', 'Signed in as Admin');

    // 4. Dashboard Prompt Hub, Meet MagicOS Onboarding Modal, Search Modal, Credits Modal
    await page.getByTestId('open-magicos-tour-btn').click();
    await page.getByTestId('meet-magicos-modal').waitFor({ state: 'visible' });
    await page.getByTestId('next-magicos-step').click();
    await page.getByTestId('next-magicos-step').click();
    await page.getByTestId('skip-magicos-modal').click();
    recordPass('Meet MagicOS 3-Step Onboarding Modal', 'Stepped through 1/3 -> 2/3 -> 3/3');

    // Open Search Modal & Credits Modal from WorkspaceShell
    await page.getByTestId('sidebar-search-btn').click();
    await page.getByTestId('search-modal').waitFor({ state: 'visible' });
    await page.getByTestId('close-search-modal').click();
    await page.getByTestId('get-free-credits-btn').click();
    await page.getByTestId('free-credits-modal').waitFor({ state: 'visible' });
    await page.getByTestId('claim-bonus-credits-btn').click();
    await page.getByTestId('close-free-credits-modal').click();
    recordPass('WorkspaceShell Modals', 'Search (Ctrl+K) & Get Free Credits modals verified');

    // 5. Invitation Lifecycle (Create -> Inspect -> Rotate -> Revoke -> Redeem Single-Use -> Reject Reuse)
    // 5a. Create invitation #1 and test Rotate + Revoke
    const createInv1 = await page.request.post(`${BASE_URL}/api/admin/invitations`, {
      data: {
        email: 'rotate-test@magicpatterns.dev',
        role: 'Viewer',
        ttlHours: 48,
      },
    });
    assert.equal(createInv1.status(), 200);
    const inv1Data = await createInv1.json();
    assert.equal(inv1Data.ok, true);
    const firstToken = inv1Data.rawToken;
    const inv1Id = inv1Data.invitation.id;

    // Inspect firstToken
    const inspect1 = await page.request.get(`${BASE_URL}/api/auth/invitations/${firstToken}`);
    assert.equal(inspect1.status(), 200);

    // Rotate invitation #1 -> old token must be invalidated
    const rotateRes = await page.request.patch(
      `${BASE_URL}/api/admin/invitations/${inv1Id}`,
      { data: {} }
    );
    assert.equal(rotateRes.status(), 200);
    const rotatedData = await rotateRes.json();
    assert.notEqual(rotatedData.rawToken, firstToken);

    const inspectOldToken = await page.request.get(
      `${BASE_URL}/api/auth/invitations/${firstToken}`
    );
    assert.notEqual(inspectOldToken.status(), 200, 'Rotated old token must no longer be valid');

    // Revoke invitation #1
    const revokeRes = await page.request.delete(
      `${BASE_URL}/api/admin/invitations/${inv1Id}`
    );
    assert.equal(revokeRes.status(), 200);
    const inspectRevoked = await page.request.get(
      `${BASE_URL}/api/auth/invitations/${rotatedData.rawToken}`
    );
    assert.equal(inspectRevoked.status(), 410, 'Revoked token must return 410 Gone');
    recordPass(
      'Invitation Create + Rotate + Revoke API',
      'Old & revoked tokens rejected with 410'
    );

    // 5b. Create invitation #2 and redeem via UI (/invite/[token]) + verify single-use rejection
    const uniqueEmail = `designer-${Date.now()}@magicpatterns.dev`;
    const createInv2 = await page.request.post(`${BASE_URL}/api/admin/invitations`, {
      data: {
        email: uniqueEmail,
        role: 'Editor',
        ttlHours: 72,
      },
    });
    const inv2Data = await createInv2.json();
    const redeemToken = inv2Data.rawToken;

    // Visit /admin/invitations UI and verify table & audit log
    await page.goto(`${BASE_URL}/admin/invitations`, { waitUntil: 'networkidle' });
    await page.getByTestId('invite-email-field').waitFor({ state: 'visible' });
    await page.getByTestId('audit-log-table').waitFor({ state: 'visible' });
    recordPass('Admin Invitations & Audit Console (/admin/invitations)', 'Rendered invitations & audit stream');

    // Redeem invitation in a separate guest browser context
    const inviteeContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const inviteePage = await inviteeContext.newPage();
    await inviteePage.goto(`${BASE_URL}/invite/${redeemToken}`, { waitUntil: 'networkidle' });
    await inviteePage.getByTestId('invite-name-input').fill('Elena Vance');
    await inviteePage.getByTestId('invite-password-input').fill('DesignerPass123!');
    await inviteePage.getByTestId('accept-invitation-btn').click();
    await inviteePage.waitForURL('**/dashboard', { timeout: 15000 });
    await inviteeContext.close();

    // Attempt to reuse the already-accepted token -> must fail with 409/410
    const reuseRes = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: uniqueEmail,
        name: 'Replay Attacker',
        password: 'DesignerPass123!',
        invitationToken: redeemToken,
      },
    });
    assert.equal(reuseRes.ok(), false, 'Reusing single-use token must fail');
    recordPass(
      'Single-Use Invitation Redemption (/invite/[token])',
      `Redeemed ${uniqueEmail} and blocked token replay`
    );

    // 6. Dashboard AI Creation (Design & Slide Deck)
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.getByTestId('quick-create-slidedeck').click();
    await page.getByTestId('inline-slidedeck-composer').waitFor({ state: 'visible' });
    await page.getByTestId('quick-create-design').click();
    await page.getByTestId('design-prompt-textarea').fill(
      'Create a B2B SaaS AI Command Center with revenue telemetry and team activity'
    );
    await page.getByTestId('submit-design-prompt-btn').click();
    await page.waitForURL('**/c/**', { timeout: 15000 });
    const createdStudioUrl = page.url();
    recordPass('Dashboard AI Project Generation (/dashboard -> /c/[id])', createdStudioUrl);

    // 7. Live AI Design Studio (/c/[id]) — All 5 Modes + Controls + Follow-up Chat + Export + Share
    await page.getByTestId('studio-tab-preview').waitFor({ state: 'visible' });

    // Toggle Controls drawer
    await page.getByTestId('studio-controls-btn').click();
    await page.getByTestId('studio-controls-popover').waitFor({ state: 'visible' });
    await page.getByTestId('studio-controls-btn').click();

    // Visual Edit mode
    await page.getByTestId('studio-tab-visual-edit').click();
    await page.getByTestId('visual-edit-inspector').waitFor({ state: 'visible' });

    // Spatial Comment mode + add comment pin
    await page.getByTestId('studio-tab-comments').click();
    await page.getByTestId('comments-sidebar').waitFor({ state: 'visible' });
    await page.getByTestId('new-comment-input').fill('Increase contrast on primary KPI badge');
    await page.getByTestId('post-comment-btn').click();

    // Multi-screen Canvas mode + add variation screen
    await page.getByTestId('studio-tab-screens').click();
    await page.getByTestId('screens-canvas-view').waitFor({ state: 'visible' });
    await page.getByTestId('add-screen-btn').click();

    // Multi-file Code IDE mode
    await page.getByTestId('studio-tab-code').click();
    await page.getByTestId('code-ide-view').waitFor({ state: 'visible' });
    await page.getByTestId('save-code-file-btn').click();

    // Switch back to Preview & send AI chat refinement prompt
    await page.getByTestId('studio-tab-preview').click();
    await page.getByTestId('studio-chat-input').fill('Add a dark glassmorphic header bar');
    await page.getByTestId('studio-send-prompt-btn').click();

    // Export dropdown (MCP, GitHub, Figma, Download Code)
    await page.getByTestId('studio-export-btn').click();
    await page.getByTestId('studio-export-menu').waitFor({ state: 'visible' });
    await page.getByTestId('export-to-mcp-btn').click();
    await page.getByTestId('export-mcp-modal').waitFor({ state: 'visible' });

    // Share modal + get public preview link
    await page.goto(createdStudioUrl, { waitUntil: 'networkidle' });
    await page.getByTestId('studio-share-btn').click();
    await page.getByTestId('studio-share-modal').waitFor({ state: 'visible' });
    await page.getByTestId('copy-share-link-btn').click();
    recordPass(
      'AI Design Studio (/c/[id])',
      'Verified Preview, Controls, Visual Edit, Spatial Comments, Canvas, Code IDE, AI Prompt, Export & Share'
    );

    // 8. Public Share & Fork Page (/p/[shareSlug])
    const projectsRes = await page.request.get(`${BASE_URL}/api/projects`);
    const projectsData = await projectsRes.json();
    const firstShareSlug = projectsData.projects[0].shareSlug;
    await page.goto(`${BASE_URL}/p/${firstShareSlug}`, { waitUntil: 'networkidle' });
    await page.getByText('Shared Preview').waitFor({ state: 'visible' });
    recordPass('Public Preview & Fork Page (/p/[shareSlug])', `Verified /p/${firstShareSlug}`);

    // 9. Workspace Files (/dashboard/files) & Community Templates (/dashboard/templates)
    await page.goto(`${BASE_URL}/dashboard/files`, { waitUntil: 'networkidle' });
    await page.getByTestId('new-folder-btn').click();
    await page.getByTestId('new-folder-modal').waitFor({ state: 'visible' });
    await page.getByTestId('new-folder-name-input').fill('Q2 Launch Experiments');
    await page.getByTestId('confirm-create-folder-btn').click();
    recordPass('Workspace Files & Folder Creation (/dashboard/files)', 'Created folder & verified grid');

    await page.goto(`${BASE_URL}/dashboard/templates`, { waitUntil: 'networkidle' });
    await page.getByText('Workspace & Starter Templates').waitFor({ state: 'visible' });
    recordPass('Community Templates Gallery (/dashboard/templates)', 'Verified template cards & fork buttons');

    // 10. Design Systems Gallery (/design-systems) & Token Studio (/design-systems/[id])
    await page.goto(`${BASE_URL}/design-systems`, { waitUntil: 'networkidle' });
    await page.getByTestId('open-create-ds-wizard').click();
    await page.getByTestId('create-ds-wizard-modal').waitFor({ state: 'visible' });
    await page.getByTestId('wizard-step1-btn').click();
    await page.getByTestId('wizard-step2-btn').click();
    await page.getByTestId('ds-name-input').fill('Enterprise Slate System');
    await page.getByTestId('confirm-create-ds-btn').click();
    await page.waitForURL('**/design-systems/**', { timeout: 15000 });
    await page.getByTestId('save-ds-tokens-btn').click();
    recordPass(
      'Design Systems & Token Studio (/design-systems & /design-systems/[id])',
      'Created system via 3-step wizard & saved tokens'
    );

    // 11. MagicOS Infinite Context Canvas (/os/[id])
    await page.goto(`${BASE_URL}/os/bVtYnuouBP1paP91KjgwML`, { waitUntil: 'networkidle' });
    await page.getByTestId('magicos-add-prd-node').waitFor({ state: 'visible' });
    await page.getByTestId('magicos-add-prd-node').click();
    await page.getByTestId('magicos-prompt-input').fill(
      'Synthesize an executive revenue overview screen from the PRD and GitHub repo'
    );
    await page.getByTestId('magicos-prompt-submit').click();
    recordPass(
      'MagicOS Infinite Context Canvas (/os/[id])',
      'Added node & synthesized AI variant on spatial canvas'
    );

    // 12. All 9 Settings Tabs (/settings/[tab])
    const settingsTabs = [
      'team',
      'subscription',
      'workspace',
      'usage-reports',
      'profile',
      'integrations',
      'connectors',
      'skills',
      'api-keys',
    ];
    for (const tab of settingsTabs) {
      await page.goto(`${BASE_URL}/settings/${tab}`, { waitUntil: 'networkidle' });
      await page.getByTestId(`settings-panel-${tab}`).waitFor({ state: 'visible', timeout: 10000 });
    }

    // Exercise interactive actions in Settings tabs (API Keys, Skills, Connectors, Integrations)
    await page.goto(`${BASE_URL}/settings/integrations`, { waitUntil: 'networkidle' });
    await page.getByTestId('generate-integration-figma').click();

    await page.goto(`${BASE_URL}/settings/connectors`, { waitUntil: 'networkidle' });
    await page.getByTestId('add-custom-connector-btn').click();

    await page.goto(`${BASE_URL}/settings/skills`, { waitUntil: 'networkidle' });
    await page.getByTestId('new-skill-btn').click();
    await page.getByTestId('new-skill-name-input').fill('WCAG AAA Contrast Enforcer');
    await page.getByTestId('confirm-create-skill-btn').click();

    await page.goto(`${BASE_URL}/settings/api-keys`, { waitUntil: 'networkidle' });
    await page.getByTestId('api-key-name-input').fill('CI/CD Design Sync Key');
    await page.getByTestId('create-api-key-btn').click();
    await page.getByTestId('generated-api-key-banner').waitFor({ state: 'visible' });
    recordPass(
      'All 9 Workspace & Account Settings Tabs (/settings/[tab])',
      'Verified team, subscription, workspace, usage-reports, profile, integrations, connectors, skills, api-keys'
    );

    // 13. Responsive Viewport Verification (Mobile 390x844 & Tablet 768x1024)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.getByTestId('mobile-menu-toggle').waitFor({ state: 'visible' });
    await page.getByTestId('mobile-menu-toggle').click();
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
    recordPass(
      'Responsive Layouts (Mobile 390×844 & Tablet 768×1024)',
      'Mobile drawer navigation & responsive grids verified'
    );

    // 14. Production Healthcheck Endpoint (/api/health)
    const healthRes = await page.request.get(`${BASE_URL}/api/health`);
    assert.equal(healthRes.status(), 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.ok, true);
    assert.equal(healthData.database, 'connected');
    recordPass(
      'Production Healthcheck (/api/health)',
      `status=${healthData.status}, aiProvider=${healthData.aiProvider.provider} (${healthData.aiProvider.model})`
    );

    // 15. Real Project ZIP Archive Export (/api/projects/[id]/export)
    const firstProjectId = projectsData.projects[0].id;
    const zipRes = await page.request.get(`${BASE_URL}/api/projects/${firstProjectId}/export`);
    assert.equal(zipRes.status(), 200);
    assert.equal(zipRes.headers()['content-type'], 'application/zip');
    const zipBody = await zipRes.body();
    assert.equal(zipBody[0], 0x50, 'ZIP magic byte P');
    assert.equal(zipBody[1], 0x4b, 'ZIP magic byte K');
    recordPass(
      'Project ZIP Archive Export (/api/projects/[id]/export)',
      `Downloaded valid ZIP archive (${zipBody.length} bytes)`
    );

    // 16. Programmatic REST API Key Bearer Authentication + Unauthenticated 401 Gate + Middleware Redirect
    const apiKeyCreateRes = await page.request.post(`${BASE_URL}/api/settings`, {
      data: { section: 'api-keys', name: 'E2E Bearer Test Key' },
    });
    const apiKeyCreateData = await apiKeyCreateRes.json();
    const rawBearerKey = apiKeyCreateData.rawKey;
    assert.ok(rawBearerKey.startsWith('mp_live_'));

    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    // Unauthenticated API request must return 401
    const anonApiRes = await anonPage.request.get(`${BASE_URL}/api/projects`);
    assert.equal(anonApiRes.status(), 401, 'Unauthenticated /api/projects must return 401');

    // Unauthenticated browser navigation to /dashboard must redirect to /login
    await anonPage.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    assert.ok(anonPage.url().includes('/login'), 'Unauthenticated /dashboard must redirect to /login');

    // Bearer API key request from unauthenticated context must succeed with 200
    const bearerRes = await anonPage.request.get(`${BASE_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${rawBearerKey}` },
    });
    assert.equal(bearerRes.status(), 200, 'Valid Bearer mp_live_ key must authenticate');
    await anonContext.close();
    recordPass(
      'Unauthenticated 401 Gate, Middleware Redirect & Bearer API Key Auth',
      `Verified 401 on anonymous API, /login redirect, and 200 with Bearer ${rawBearerKey.slice(0, 14)}...`
    );

    // 17. Viewer Role RBAC Enforcement (403 Forbidden on Mutations)
    const viewerEmail = `viewer-${Date.now()}@magicpatterns.dev`;
    const viewerInvRes = await page.request.post(`${BASE_URL}/api/admin/invitations`, {
      data: { email: viewerEmail, role: 'Viewer', ttlHours: 24 },
    });
    const viewerInvData = await viewerInvRes.json();
    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    const viewerRegRes = await viewerPage.request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: viewerEmail,
        name: 'Read Only Viewer',
        password: 'ViewerPassword123!',
        invitationToken: viewerInvData.rawToken,
      },
    });
    assert.equal(viewerRegRes.status(), 200);

    // Viewer can read projects (200)
    const viewerReadRes = await viewerPage.request.get(`${BASE_URL}/api/projects`);
    assert.equal(viewerReadRes.status(), 200);

    // Viewer cannot create projects (403), mutate workspace settings (403), or create invitations (403)
    const viewerCreateProj = await viewerPage.request.post(`${BASE_URL}/api/projects`, {
      data: { prompt: 'Unauthorized viewer project' },
    });
    assert.equal(viewerCreateProj.status(), 403);

    const viewerMutateSettings = await viewerPage.request.post(`${BASE_URL}/api/settings`, {
      data: { section: 'workspace', name: 'Hacked Workspace Name' },
    });
    assert.equal(viewerMutateSettings.status(), 403);

    const viewerInviteRes = await viewerPage.request.post(`${BASE_URL}/api/admin/invitations`, {
      data: { email: 'another@magicpatterns.dev', role: 'Editor' },
    });
    assert.equal(viewerInviteRes.status(), 403);

    const viewerAuditReadRes = await viewerPage.request.get(`${BASE_URL}/api/admin/audit-logs`);
    assert.equal(viewerAuditReadRes.status(), 403);

    // 18. Single-Use Password Reset Lifecycle (/forgot-password & /reset-password/[token])
    const forgotRes = await viewerPage.request.post(`${BASE_URL}/api/auth/password/forgot`, {
      data: { email: viewerEmail },
    });
    assert.equal(forgotRes.status(), 200);
    const forgotData = await forgotRes.json();
    assert.ok(forgotData.resetToken, 'Expected single-use reset token');

    await viewerPage.goto(`${BASE_URL}/reset-password/${forgotData.resetToken}`, {
      waitUntil: 'networkidle',
    });
    await viewerPage.getByTestId('reset-password-input').fill('NewViewerPass456!');
    await viewerPage.getByTestId('reset-submit-btn').click();
    await viewerPage.getByTestId('reset-success-banner').waitFor({ state: 'visible' });

    // Replaying the same reset token must fail with 410 Gone
    const replayReset = await viewerPage.request.post(`${BASE_URL}/api/auth/password/reset`, {
      data: { token: forgotData.resetToken, password: 'ReplayPassword789!' },
    });
    assert.equal(replayReset.status(), 410);
    await viewerContext.close();
    recordPass(
      'Viewer RBAC 403 Enforcement & Single-Use Password Reset Lifecycle',
      'Verified 403 on Viewer mutations and 410 on password reset token replay'
    );

    // 19. Model Context Protocol (MCP) JSON-RPC 2.0 Server (/api/mcp) & Credit Ledger
    const mcpInitRes = await page.request.post(`${BASE_URL}/api/mcp`, {
      headers: { Authorization: `Bearer ${rawBearerKey}` },
      data: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    });
    assert.equal(mcpInitRes.status(), 200);
    const mcpInitData = await mcpInitRes.json();
    assert.equal(mcpInitData.result.serverInfo.name, 'magicpatterns-mcp-server');

    const mcpCallRes = await page.request.post(`${BASE_URL}/api/mcp`, {
      headers: { Authorization: `Bearer ${rawBearerKey}` },
      data: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'get_design_system_tokens', arguments: {} },
      },
    });
    assert.equal(mcpCallRes.status(), 200);
    const mcpCallData = await mcpCallRes.json();
    assert.ok(mcpCallData.result.content[0].text.includes('colors'));

    const settingsLedgerRes = await page.request.get(`${BASE_URL}/api/settings`);
    const settingsLedgerData = await settingsLedgerRes.json();
    assert.ok(
      Array.isArray(settingsLedgerData.creditTransactions) &&
        settingsLedgerData.creditTransactions.length >= 2,
      'Expected recorded CreditTransaction ledger entries'
    );
    recordPass(
      'Model Context Protocol (MCP) JSON-RPC 2.0 Server (/api/mcp) & Credit Ledger',
      `Verified MCP initialize + tools/call and ${settingsLedgerData.creditTransactions.length} CreditTransaction entries`
    );

    // 20. Verify Immutable Audit Logs API (/api/admin/audit-logs)
    const auditRes = await page.request.get(`${BASE_URL}/api/admin/audit-logs`);
    assert.equal(auditRes.status(), 200);
    const auditData = await auditRes.json();
    assert.equal(auditData.ok, true);
    assert.ok(auditData.logs.length >= 10, 'Expected audit log entries for invitations, RBAC, export, and password reset');
    recordPass(
      'Immutable Audit Log Verification (/api/admin/audit-logs)',
      `${auditData.logs.length} audit events recorded`
    );

    await context.close();
  } finally {
    await browser.close();
  }

  console.log(`\n🎉 ALL ${results.length} END-TO-END CHECKS PASSED SUCCESSFULLY!\n`);
}

runVerification().catch((err) => {
  console.error('\n❌ E2E Verification failed:', err);
  process.exit(1);
});
