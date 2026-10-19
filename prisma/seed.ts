import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/account-admission/passwords';
import { createOpaqueToken, hashOpaqueToken } from '../src/lib/account-admission/tokens';
import { synthesizeProjectArtifacts } from '../src/lib/ai-engine';

async function main() {
  console.log('Seeding Magic Patterns database...');

  const now = new Date();
  const passwordHash = await hashPassword('MagicPatterns2026!');

  // 1. Primary Admin User (Joshuah Powlowski - matching explored session)
  const adminUser = await prisma.user.upsert({
    where: { email: 'powlowskijoshuah@gmail.com' },
    update: {
      name: 'Joshuah Powlowski',
      firstName: 'Joshuah',
      lastName: 'Powlowski',
      role: 'Admin',
      status: 'active',
      passwordHash,
    },
    create: {
      id: 'u_joshuah',
      email: 'powlowskijoshuah@gmail.com',
      emailVerified: now,
      name: 'Joshuah Powlowski',
      firstName: 'Joshuah',
      lastName: 'Powlowski',
      handle: 'joshuah',
      billingEmail: 'billing@magicpatterns.com',
      role: 'Admin',
      status: 'active',
      passwordHash,
      streakDays: 7,
      tokensUsed: 18450,
      connectedAccountsJson: JSON.stringify({
        linkedin: false,
        github: true,
        figma: true,
      }),
    },
  });

  await prisma.passwordCredential.upsert({
    where: { userId: adminUser.id },
    update: { passwordHash, passwordChangedAt: now },
    create: { userId: adminUser.id, passwordHash, passwordChangedAt: now },
  });

  // 2. Secondary Collaborator User (Alex Rivera - Editor)
  const editorUser = await prisma.user.upsert({
    where: { email: 'alex@magicpatterns.com' },
    update: {
      name: 'Alex Rivera',
      firstName: 'Alex',
      lastName: 'Rivera',
      role: 'Editor',
      status: 'active',
      passwordHash,
    },
    create: {
      id: 'u_alex_editor',
      email: 'alex@magicpatterns.com',
      emailVerified: now,
      name: 'Alex Rivera',
      firstName: 'Alex',
      lastName: 'Rivera',
      handle: 'alexrivera',
      role: 'Editor',
      status: 'active',
      passwordHash,
    },
  });

  await prisma.passwordCredential.upsert({
    where: { userId: editorUser.id },
    update: { passwordHash, passwordChangedAt: now },
    create: { userId: editorUser.id, passwordHash, passwordChangedAt: now },
  });

  // 3. Workspace ("Joshuah's Workspace")
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'joshuahs-workspace' },
    update: {
      name: "Joshuah's Workspace",
    },
    create: {
      id: 'ws_joshuah',
      name: "Joshuah's Workspace",
      slug: 'joshuahs-workspace',
      logoColor: '#16A34A',
      planTier: 'FREE',
      billingInterval: 'monthly',
      shareNewDesignsWithWorkspace: true,
      ssoEnabled: false,
      rolledOverCredits: 0,
      monthlyCreditsUsed: 0,
      monthlyCreditsQuota: 0,
      freeCreditsUsed: 5,
      freeCreditsQuota: 100,
      giftedCredits: 0,
      purchasedCredits: 0,
      paymentMethodJson: JSON.stringify({
        brand: '',
        last4: '',
        expMonth: '',
        expYear: '',
      }),
      invoicesJson: JSON.stringify([]),
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: adminUser.id,
      },
    },
    update: { role: 'Admin', plan: 'Free' },
    create: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: 'Admin',
      plan: 'Free',
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: editorUser.id,
      },
    },
    update: { role: 'Editor', plan: 'Free' },
    create: {
      workspaceId: workspace.id,
      userId: editorUser.id,
      role: 'Editor',
      plan: 'Free',
    },
  });

  // 4. Folders
  await prisma.folder.deleteMany({ where: { workspaceId: workspace.id } });
  const folderCheckout = await prisma.folder.create({
    data: {
      id: 'fld_checkout',
      workspaceId: workspace.id,
      name: 'Checkout & Growth',
      color: '#4F46E5',
      createdById: adminUser.id,
    },
  });
  await prisma.folder.create({
    data: {
      id: 'fld_design_sys',
      workspaceId: workspace.id,
      name: 'Q4 Launch Explorations',
      color: '#10B981',
      createdById: adminUser.id,
    },
  });

  // 5. Design Systems (Base Shadcn + Modern B2B SaaS + Playful Consumer App)
  await prisma.designSystem.deleteMany({ where: { workspaceId: workspace.id } });
  const dsBase = await prisma.designSystem.create({
    data: {
      id: 'ds_shadcn_base',
      workspaceId: workspace.id,
      createdById: adminUser.id,
      name: 'Base (Shadcn)',
      description: 'Clean neutral slate palette with Inter typography and accessible Radix primitives.',
      sourceType: 'preset',
      presetKey: 'shadcn',
      isDefault: true,
      colorsJson: JSON.stringify({
        primary: '#0F172A',
        accent: '#4F46E5',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
      }),
      typographyJson: JSON.stringify({
        headingFont: 'Inter',
        bodyFont: 'Inter',
        monoFont: 'JetBrains Mono',
        baseSize: '14px',
      }),
      radius: '0.5rem',
      customCss: ':root {\n  --radius: 0.5rem;\n  --primary: 222.2 47.4% 11.2%;\n  --accent: 238.7 83.5% 66.7%;\n}',
      componentsJson: JSON.stringify([
        { name: 'Button', variants: ['Primary', 'Secondary', 'Outline', 'Ghost'], status: 'Ready' },
        { name: 'MetricCard', variants: ['Default', 'Compact', 'Dark'], status: 'Ready' },
        { name: 'Badge', variants: ['Success', 'Neutral', 'Warning'], status: 'Ready' },
        { name: 'Input', variants: ['Default', 'Search', 'WithIcon'], status: 'Ready' },
      ]),
    },
  });

  const dsB2b = await prisma.designSystem.create({
    data: {
      id: 'ds_modern_b2b',
      workspaceId: workspace.id,
      createdById: adminUser.id,
      name: 'Modern B2B SaaS',
      description: 'High-density enterprise data system with crisp indigo accents and tabular numeric alignment.',
      sourceType: 'github',
      sourceUrl: 'https://github.com/acme/web-design-system',
      presetKey: 'modern-b2b',
      isDefault: false,
      colorsJson: JSON.stringify({
        primary: '#4F46E5',
        accent: '#0EA5E9',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#CBD5E1',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      }),
      typographyJson: JSON.stringify({
        headingFont: 'Plus Jakarta Sans',
        bodyFont: 'Inter',
        monoFont: 'JetBrains Mono',
        baseSize: '14px',
      }),
      radius: '0.75rem',
      customCss: ':root {\n  --radius: 0.75rem;\n  --brand-primary: #4F46E5;\n}',
      componentsJson: JSON.stringify([
        { name: 'DataTable', variants: ['Sortable', 'Compact'], status: 'Ready' },
        { name: 'KPICard', variants: ['Sparkline', 'Comparison'], status: 'Ready' },
      ]),
    },
  });

  // 6. Design Projects & Templates
  await prisma.designProject.deleteMany({ where: { workspaceId: workspace.id } });

  const revArtifacts = synthesizeProjectArtifacts({
    name: 'Revenue Metric Card',
    prompt: 'Create a clean SaaS analytics metric card with revenue chart and trend badge',
    type: 'DESIGN',
    designSystemName: 'Base (Shadcn)',
    accentColor: '#4F46E5',
  });

  await prisma.designProject.create({
    data: {
      id: 'tvajgfewuihg5kqchnvgxv',
      shareSlug: 'project-revenue-metric-card-491',
      workspaceId: workspace.id,
      folderId: folderCheckout.id,
      designSystemId: dsBase.id,
      createdById: adminUser.id,
      name: 'Revenue Metric Card',
      prompt: 'Create a clean SaaS analytics metric card with revenue chart and trend badge',
      type: 'DESIGN',
      model: 'Auto',
      status: 'READY',
      visibility: 'WORKSPACE',
      workspaceAccess: 'Editor',
      publicPermission: 'PREVIEW_ONLY',
      isTemplate: false,
      isFavorite: true,
      showWatermark: true,
      thumbnailAccent: '#4F46E5',
      filesJson: revArtifacts.filesJson,
      screensJson: revArtifacts.screensJson,
      messagesJson: revArtifacts.messagesJson,
      versionsJson: revArtifacts.versionsJson,
      commentsJson: JSON.stringify([
        {
          id: 'cmt_1',
          screenId: 'screen_main',
          x: 68,
          y: 28,
          authorName: 'Joshuah Powlowski',
          authorEmail: 'powlowskijoshuah@gmail.com',
          content: 'Love the 7D / 30D / 90D / 1Y range switcher—let us also test a dark mode variant for enterprise dashboards.',
          status: 'OPEN',
          createdAt: now.toISOString(),
          replies: [],
        },
      ]),
      collaboratorsJson: JSON.stringify([
        { email: 'alex@magicpatterns.com', role: 'Editor' },
      ]),
      viewsCount: 18,
      forksCount: 3,
    },
  });

  const checkoutArtifacts = synthesizeProjectArtifacts({
    name: 'Mobile Express Checkout',
    prompt: 'Two-column and express mobile checkout flow with Apple Pay, order summary, and promo code drawer',
    type: 'DESIGN',
    designSystemName: 'Modern B2B SaaS',
    accentColor: '#10B981',
  });

  await prisma.designProject.create({
    data: {
      id: 'prj_checkout_template',
      shareSlug: 'project-mobile-express-checkout',
      workspaceId: workspace.id,
      folderId: folderCheckout.id,
      designSystemId: dsB2b.id,
      createdById: editorUser.id,
      name: 'Mobile Express Checkout',
      prompt: 'Two-column and express mobile checkout flow with Apple Pay, order summary, and promo code drawer',
      type: 'DESIGN',
      model: 'Claude 3.7 Sonnet',
      status: 'READY',
      visibility: 'WORKSPACE',
      workspaceAccess: 'Editor',
      publicPermission: 'CODE_AND_FORK',
      isTemplate: true,
      isFavorite: true,
      showWatermark: false,
      thumbnailAccent: '#10B981',
      filesJson: checkoutArtifacts.filesJson,
      screensJson: checkoutArtifacts.screensJson,
      messagesJson: checkoutArtifacts.messagesJson,
      versionsJson: checkoutArtifacts.versionsJson,
      viewsCount: 42,
      forksCount: 11,
    },
  });

  const deckArtifacts = synthesizeProjectArtifacts({
    name: 'Q4 Product Review Deck',
    prompt: 'Quarterly review presentation covering ARR growth, MagicOS adoption, and mobile checkout conversion lift',
    type: 'SLIDE_DECK',
    designSystemName: 'Base (Shadcn)',
    accentColor: '#7C3AED',
  });

  await prisma.designProject.create({
    data: {
      id: 'prj_q4_slide_deck',
      shareSlug: 'project-q4-product-review-deck',
      workspaceId: workspace.id,
      designSystemId: dsBase.id,
      createdById: adminUser.id,
      name: 'Q4 Product Review Deck',
      prompt: 'Quarterly review presentation covering ARR growth, MagicOS adoption, and mobile checkout conversion lift',
      type: 'SLIDE_DECK',
      model: 'Auto',
      status: 'READY',
      visibility: 'WORKSPACE',
      workspaceAccess: 'Editor',
      publicPermission: 'PREVIEW_ONLY',
      isTemplate: true,
      isFavorite: false,
      showWatermark: true,
      thumbnailAccent: '#7C3AED',
      filesJson: deckArtifacts.filesJson,
      screensJson: deckArtifacts.screensJson,
      messagesJson: deckArtifacts.messagesJson,
      versionsJson: deckArtifacts.versionsJson,
      viewsCount: 29,
      forksCount: 5,
    },
  });

  // 7. MagicOS Infinite Canvas (/os/bVtYnuouBP1paP91KjgwML)
  await prisma.canvasProject.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.canvasProject.create({
    data: {
      id: 'bVtYnuouBP1paP91KjgwML',
      workspaceId: workspace.id,
      createdById: adminUser.id,
      name: 'Checkout Redesign MagicOS',
      zoom: 1.0,
      panX: 0,
      panY: 0,
      nodesJson: JSON.stringify([
        {
          id: 'node_prd',
          type: 'prd',
          title: 'Checkout PRD',
          subtitle: 'Pasted ⌘V',
          x: 80,
          y: 90,
          content: 'Goal: Cut checkout drop-off on mobile by a third. Requirements: Express Apple Pay/Google Pay button, collapsible order summary, inline validation.',
        },
        {
          id: 'node_repo',
          type: 'github_repo',
          title: 'acme/web',
          subtitle: 'main • cd21e5b Checkout states',
          status: 'Connected',
          x: 80,
          y: 280,
          content: 'Connected GitHub repository pulling live Tailwind tokens and checkout state machine.',
        },
        {
          id: 'node_img',
          type: 'image_ref',
          title: 'brand-refs.jpg',
          subtitle: 'Dropped in',
          x: 80,
          y: 440,
          content: 'Visual reference moodboard with high-contrast CTA buttons and trust badges.',
        },
        {
          id: 'node_var1',
          type: 'ui_variant',
          title: 'Checkout · Two column',
          subtitle: 'Variant A • Desktop & Mobile',
          x: 440,
          y: 90,
          projectId: 'tvajgfewuihg5kqchnvgxv',
          content: 'Split summary + sticky payment form with 1-click express checkout bar.',
        },
        {
          id: 'node_var2',
          type: 'ui_variant',
          title: 'Checkout · Stepped',
          subtitle: 'Variant B • 3-step progressive',
          x: 440,
          y: 270,
          projectId: 'prj_checkout_template',
          content: 'Shipping -> Payment -> Review progressive disclosure wizard.',
        },
        {
          id: 'node_var3',
          type: 'ui_variant',
          title: 'Checkout · Express',
          subtitle: 'Variant C • Single sheet',
          x: 440,
          y: 450,
          projectId: 'prj_checkout_template',
          content: 'Ultra-compact bottom-sheet express checkout optimized for mobile conversion.',
        },
        {
          id: 'node_mcp',
          type: 'mcp_agent',
          title: 'Your coding agents (MCP)',
          subtitle: 'Claude Code • Cursor • Codex',
          status: 'Connected',
          x: 820,
          y: 240,
          content: 'Handoff ready via Magic Patterns MCP Server. Agents can pull components, tokens, and PRD context directly.',
        },
      ]),
      edgesJson: JSON.stringify([
        { from: 'node_prd', to: 'node_var1' },
        { from: 'node_repo', to: 'node_var2' },
        { from: 'node_img', to: 'node_var3' },
        { from: 'node_var1', to: 'node_mcp' },
        { from: 'node_var2', to: 'node_mcp' },
        { from: 'node_var3', to: 'node_mcp' },
      ]),
      transcriptJson: JSON.stringify([
        {
          id: 'tr_1',
          role: 'user',
          text: 'Combine our Checkout PRD, acme/web repo, and brand references to generate 3 checkout variants and prepare MCP handoff.',
          createdAt: now.toISOString(),
        },
        {
          id: 'tr_2',
          role: 'assistant',
          text: 'Generated 3 interactive variants (Two column, Stepped, and Express) linked to acme/web tokens and exposed via MCP for Claude Code, Cursor, and Codex.',
          createdAt: now.toISOString(),
        },
      ]),
    },
  });

  // 8. MCP Connectors (matching /settings/connectors)
  await prisma.mcpConnector.deleteMany({ where: { workspaceId: workspace.id } });
  const defaultConnectors = [
    {
      provider: 'Granola',
      name: 'Granola',
      description: 'Connect to Granola to pull meeting notes and context into your designs.',
      status: 'DISCONNECTED',
    },
    {
      provider: 'Notion',
      name: 'Notion',
      description: 'Connect to Notion to pull pages, databases, and content into your designs.',
      status: 'CONNECTED',
    },
    {
      provider: 'Linear',
      name: 'Linear',
      description: 'Connect to Linear to pull issues, projects, and roadmaps into your designs.',
      status: 'CONNECTED',
    },
    {
      provider: 'Miro',
      name: 'Miro',
      description: 'Connect to Miro to pull boards, frames, and visual context into your designs.',
      status: 'DISCONNECTED',
    },
    {
      provider: 'Jira',
      name: 'Jira',
      description: 'Connect to Jira to pull project context into your designs.',
      status: 'DISCONNECTED',
    },
    {
      provider: 'Mobbin',
      name: 'Mobbin',
      description: 'Connect to Mobbin to pull real-world UI design patterns into your designs.',
      status: 'DISCONNECTED',
    },
  ];
  for (const c of defaultConnectors) {
    await prisma.mcpConnector.create({
      data: {
        workspaceId: workspace.id,
        provider: c.provider,
        name: c.name,
        description: c.description,
        status: c.status,
        isCustom: false,
      },
    });
  }

  // 9. Featured AI Skills (matching /settings/skills)
  await prisma.aiSkill.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.aiSkill.createMany({
    data: [
      {
        id: 'skill_better_animation',
        workspaceId: workspace.id,
        slug: 'better-animation',
        name: 'Better Animation',
        description:
          'Create, review, and improve UI motion and animation in a self-contained way. Use when the user wants animations added, reviewed, debugged, softened, made smoother, or wants advice on gestures, transitions, springs, or motion behavior in a frontend.',
        commandRepo: 'npx skills add magicpatterns/skills --skill better-animation',
        skillMarkdown: '# Better Animation\nUse spring physics (stiffness: 260, damping: 24) and subtle opacity/transform transitions.',
        isFeatured: true,
        isEnabled: true,
      },
      {
        id: 'skill_audit_a11y',
        workspaceId: workspace.id,
        slug: 'audit-a11y',
        name: 'Audit a11y',
        description:
          'Check a frontend or website for accessibility issues using a self-contained audit flow. Use when the user asks for an accessibility audit, a11y check, WCAG review, compliance scan, or wants specific accessibility concerns verified.',
        commandRepo: 'npx skills add magicpatterns/skills --skill audit-a11y',
        skillMarkdown: '# Accessibility Audit (WCAG 2.1 AA)\nVerify contrast ratios >= 4.5:1, keyboard focus rings, and ARIA labels.',
        isFeatured: true,
        isEnabled: true,
      },
    ],
  });

  // 10. Sample Invitation & Audit Log
  await prisma.accountInvitation.deleteMany({});
  const sampleToken = createOpaqueToken();
  await prisma.accountInvitation.create({
    data: {
      id: 'inv_sample_pending',
      email: 'designer@company.com',
      normalizedEmail: 'designer@company.com',
      activeForEmail: 'designer@company.com',
      tokenHash: hashOpaqueToken(sampleToken),
      role: 'Editor',
      status: 'PENDING',
      workspaceId: workspace.id,
      invitedById: adminUser.id,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'system.admin.bootstrap',
        targetType: 'user',
        targetId: adminUser.id,
        metadataJson: JSON.stringify({ source: 'seed', role: 'Admin' }),
      },
      {
        workspaceId: workspace.id,
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'account.invitation.create',
        targetType: 'invitation',
        targetId: 'inv_sample_pending',
        metadataJson: JSON.stringify({ email: 'designer@company.com', role: 'Editor' }),
      },
      {
        workspaceId: workspace.id,
        actorId: adminUser.id,
        actorEmail: adminUser.email,
        action: 'project.create',
        targetType: 'project',
        targetId: 'tvajgfewuihg5kqchnvgxv',
        metadataJson: JSON.stringify({ name: 'Revenue Metric Card', type: 'DESIGN' }),
      },
    ],
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
