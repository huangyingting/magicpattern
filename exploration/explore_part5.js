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

  // 1. Deep-dive Design Editor (/c/tvajgfewuihg5kqchnvgxv)
  console.log("1. Visiting /c/tvajgfewuihg5kqchnvgxv...");
  await page.goto("https://www.magicpatterns.com/c/tvajgfewuihg5kqchnvgxv", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(6000);

  // Dismiss Welcome modal if visible
  try {
    for (let i = 0; i < 4; i++) {
      const contBtn = page.getByRole("button", { name: /^Continue$|^Done$|^Get Started$|^Got it$/i }).first();
      if (await contBtn.isVisible()) {
        await contBtn.click();
        await page.waitForTimeout(600);
      } else {
        break;
      }
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  } catch (e) {}

  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/53_editor_preview_completed.png" });
  report.push(await dumpPageSummary(page, "53_editor_preview_completed"));

  // Editor actions menu
  try {
    await page.getByRole("button", { name: /Editor actions/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/54_editor_actions_menu.png" });
    report.push(await dumpPageSummary(page, "54_editor_actions_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) { console.log("Editor actions error:", e.message); }

  // Screens tab
  try {
    await page.getByRole("button", { name: /^Screens$/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/55_editor_screens_tab.png" });
    report.push(await dumpPageSummary(page, "55_editor_screens_tab"));
  } catch (e) { console.log("Screens tab error:", e.message); }

  // Code tab
  try {
    await page.getByRole("button", { name: /^Code$/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/56_editor_code_tab.png" });
    report.push(await dumpPageSummary(page, "56_editor_code_tab"));
  } catch (e) { console.log("Code tab error:", e.message); }

  // Back to Preview tab -> Controls, Visual Edit, Comments, Export, Share
  try {
    await page.getByRole("button", { name: /^Preview$/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /^Controls$/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/57_editor_controls_menu.png" });
    report.push(await dumpPageSummary(page, "57_editor_controls_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /^Visual Edit$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/58_editor_visual_edit.png" });
    report.push(await dumpPageSummary(page, "58_editor_visual_edit"));

    await page.getByRole("button", { name: /^Comments$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/59_editor_comments.png" });
    report.push(await dumpPageSummary(page, "59_editor_comments"));

    await page.getByRole("button", { name: /^Export$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/60_editor_export_modal.png" });
    report.push(await dumpPageSummary(page, "60_editor_export_modal"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /^Share$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/61_editor_share_modal.png" });
    report.push(await dumpPageSummary(page, "61_editor_share_modal"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) { console.log("Editor controls/export/share error:", e.message); }

  // 2. Check /dashboard and /dashboard/files now that a file exists!
  console.log("2. Checking /dashboard & /dashboard/files with created items...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    const closeBtn = page.getByRole("button", { name: /^Close$/i });
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(500);
  } catch (e) {}
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/62_dashboard_with_files.png" });
  report.push(await dumpPageSummary(page, "62_dashboard_with_files"));

  // List view on dashboard
  try {
    await page.getByRole("button", { name: /List view/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/63_dashboard_list_view.png" });
  } catch (e) {}

  // 3. Responsive viewports (Mobile 390x844 & Tablet 768x1024)
  console.log("3. Testing responsive viewports (Mobile & Tablet)...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  try {
    const closeBtn = page.getByRole("button", { name: /^Close$/i });
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(400);
  } catch (e) {}
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/64_mobile_dashboard.png" });

  await page.goto("https://www.magicpatterns.com/c/tvajgfewuihg5kqchnvgxv", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/65_mobile_editor.png" });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("https://www.magicpatterns.com/settings/team", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/66_tablet_settings_team.png" });

  // 4. Unauthenticated Public Pages (Landing, Pricing, Login)
  console.log("4. Exploring Public Unauthenticated Routes...");
  const pubContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pubPage = await pubContext.newPage();

  await pubPage.goto("https://www.magicpatterns.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await pubPage.waitForTimeout(3500);
  await pubPage.screenshot({ path: "/home/azadmin/magicpattern/screenshots/67_public_landing.png" });
  report.push(await dumpPageSummary(pubPage, "67_public_landing"));

  await pubPage.goto("https://www.magicpatterns.com/pricing", { waitUntil: "domcontentloaded", timeout: 45000 });
  await pubPage.waitForTimeout(3000);
  await pubPage.screenshot({ path: "/home/azadmin/magicpattern/screenshots/68_public_pricing.png" });
  report.push(await dumpPageSummary(pubPage, "68_public_pricing"));

  await pubPage.goto("https://www.magicpatterns.com/login", { waitUntil: "domcontentloaded", timeout: 45000 });
  await pubPage.waitForTimeout(3000);
  await pubPage.screenshot({ path: "/home/azadmin/magicpattern/screenshots/69_public_login.png" });
  report.push(await dumpPageSummary(pubPage, "69_public_login"));

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part5_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part5_report.json with", report.length, "entries");
  await browser.close();
})();
