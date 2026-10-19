const { chromium } = require("playwright");
const fs = require("fs");

function normalizeCookies(rawCookies) {
  return rawCookies
    .filter(c => c.name && c.value !== undefined)
    .map(c => {
      let sameSite = "Lax";
      if (c.sameSite) {
        const s = String(c.sameSite).toLowerCase();
        if (s === "strict") sameSite = "Strict";
        else if (s === "none" || s === "no_restriction") sameSite = "None";
        else if (s === "lax") sameSite = "Lax";
      }
      const cookie = {
        name: c.name,
        value: c.value,
        domain: c.domain || ".magicpatterns.com",
        path: c.path || "/",
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
        sameSite
      };
      if (c.expirationDate && typeof c.expirationDate === "number") {
        cookie.expires = Math.floor(c.expirationDate);
      }
      return cookie;
    });
}

async function dumpPageSummary(page, label) {
  return await page.evaluate((lbl) => {
    const links = Array.from(document.querySelectorAll("a[href]")).map(a => ({
      text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 100),
      href: a.getAttribute("href")
    }));
    const buttons = Array.from(document.querySelectorAll("button")).map(b => ({
      text: (b.innerText || b.getAttribute("aria-label") || b.getAttribute("title") || "").trim().slice(0, 100),
      disabled: b.disabled
    }));
    const inputs = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']")).map(i => ({
      tag: i.tagName,
      type: i.getAttribute("type"),
      placeholder: i.getAttribute("placeholder") || i.getAttribute("data-placeholder"),
      text: (i.innerText || i.value || "").slice(0, 100)
    }));
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => ({
      tag: h.tagName,
      text: h.innerText.trim().slice(0, 120)
    }));
    const dialogs = Array.from(document.querySelectorAll("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")).map(d => d.innerText.trim().slice(0, 2000));
    return {
      label: lbl,
      url: location.href,
      title: document.title,
      headings,
      links,
      buttons,
      inputs,
      dialogs,
      bodyText: document.body.innerText.slice(0, 6000)
    };
  }, label);
}

(async () => {
  const raw = JSON.parse(fs.readFileSync("/home/azadmin/magicpattern/.cred", "utf8"));
  const cookies = normalizeCookies(raw);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  const report = [];

  // 1. Create a Design System from Shadcn preset or inspect step 1 "Yes, link a source"
  console.log("1. Exploring Design System Connect Sources & Creating Design System...");
  await page.goto("https://www.magicpatterns.com/design-systems", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    await page.getByRole("button", { name: /^New$/i }).first().click();
    await page.waitForTimeout(1000);
    await page.fill("input[placeholder='My Design System']", "Acme UI System");
    // First check "Yes, link a source"
    await page.getByRole("button", { name: /Yes, link a source/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Continue/i }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/44_design_systems_connect_sources.png" });
    report.push(await dumpPageSummary(page, "44_design_systems_connect_sources"));

    // Go Back and choose "No, start another way" -> "Start from Shadcn" -> "Create design system"
    await page.getByRole("button", { name: /Back/i }).click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /No, start another way/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Continue/i }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: /Start from Shadcn/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/45_design_systems_shadcn_filled.png" });
    report.push(await dumpPageSummary(page, "45_design_systems_shadcn_filled"));
  } catch (e) {
    console.log("Design system flow error:", e.message);
  }

  // 2. Explore New Design modal sub-menus (+ Add, Design System Base, Auto, Recreate a screenshot, Import from GitHub)
  console.log("2. Exploring New Design modal options...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    const closeBtn = page.getByRole("button", { name: /^Close$/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
    await page.getByRole("button", { name: /^Design$/i }).first().click();
    await page.waitForTimeout(1200);

    // Click "+ Add" inside dialog
    const dialog = page.locator("[role='dialog']").first();
    await dialog.getByRole("button", { name: /^Add$/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/46_new_design_add_menu.png" });
    report.push(await dumpPageSummary(page, "46_new_design_add_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Click "Base" design system button inside dialog
    await dialog.getByRole("button", { name: /Base/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/47_new_design_ds_menu.png" });
    report.push(await dumpPageSummary(page, "47_new_design_ds_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Click "Auto" inside dialog
    await dialog.getByRole("button", { name: /Auto/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/48_new_design_auto_menu.png" });
    report.push(await dumpPageSummary(page, "48_new_design_auto_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Click "Import from GitHub" pill
    await dialog.getByRole("button", { name: /Import from GitHub/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/49_new_design_import_github.png" });
    report.push(await dumpPageSummary(page, "49_new_design_import_github"));
  } catch (e) {
    console.log("New Design options error:", e.message);
  }

  // 3. Submit a Design prompt to explore the actual Design Editor (/c/... or /patterns/...)
  console.log("3. Submitting a prompt in New Design to explore the Design Editor...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    const closeBtn = page.getByRole("button", { name: /^Close$/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
    await page.getByRole("button", { name: /^Design$/i }).first().click();
    await page.waitForTimeout(1200);
    const dialog = page.locator("[role='dialog']").first();
    const editorArea = dialog.locator("[contenteditable='true'], textarea").first();
    await editorArea.click();
    await page.keyboard.type("Create a clean SaaS analytics metric card with revenue chart and trend badge");
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/50_new_design_prompt_typed.png" });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(8000);
    console.log("Editor URL after Enter:", page.url());
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/51_design_editor_generating.png" });
    report.push(await dumpPageSummary(page, "51_design_editor_generating"));
    await page.waitForTimeout(18000);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/52_design_editor_ready.png" });
    report.push(await dumpPageSummary(page, "52_design_editor_ready"));
  } catch (e) {
    console.log("Design editor generation error:", e.message);
  }

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part4_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part4_report.json with", report.length, "entries");
  await browser.close();
})();
